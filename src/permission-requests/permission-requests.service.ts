import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Repository } from 'typeorm';
import { PermissionRequest } from './entities/permission-request.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { User } from '../users/entities/user.entity';
import { CreatePermissionRequestDto } from './dto/create-permission-request.dto';
import { ReviewPermissionRequestDto } from './dto/review-permission-request.dto';

@Injectable()
export class PermissionRequestsService {
  constructor(
    @InjectRepository(PermissionRequest)
    private readonly requestsRepository: Repository<PermissionRequest>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
  ) {}

  async create(
    userId: number,
    dto: CreatePermissionRequestDto,
  ): Promise<PermissionRequest> {
    const permission = await this.permissionsRepository.findOne({
      where: { id: dto.permissionId },
    });
    if (!permission) {
      throw new NotFoundException(`Permission #${dto.permissionId} not found`);
    }

    const holder = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { directPermissions: true },
    });
    if (holder?.directPermissions?.some((p) => p.id === permission.id)) {
      throw new ConflictException('You already have this permission');
    }

    const now = new Date();
    const approved = await this.requestsRepository.find({
      where: {
        user: { id: userId },
        permission: { id: permission.id },
        status: 'approved',
      },
    });
    const hasActiveApproval = approved.some(
      (r) =>
        (r.startDate == null || r.startDate <= now) &&
        (r.endDate == null || r.endDate > now),
    );
    if (hasActiveApproval) {
      throw new ConflictException('You already have this permission');
    }

    const pending = await this.requestsRepository.findOne({
      where: {
        user: { id: userId },
        permission: { id: permission.id },
        status: 'pending',
      },
    });
    if (pending) {
      throw new ConflictException(
        'You already have a pending request for this permission',
      );
    }

    const request = this.requestsRepository.create({
      user: { id: userId } as User,
      permission,
      reason: dto.reason,
      startDate: dto.startDate ? new Date(dto.startDate) : null,
      endDate: dto.endDate ? new Date(dto.endDate) : null,
      status: 'pending',
    });
    const saved = await this.requestsRepository.save(request);
    return this.getById(saved.id);
  }

  findMine(userId: number): Promise<PermissionRequest[]> {
    return this.requestsRepository.find({
      where: { user: { id: userId } },
      relations: { permission: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(
    type?: string,
    callerSystemId?: number | null,
  ): Promise<PermissionRequest[]> {
    const statusByType: Record<string, PermissionRequest['status']> = {
      '1': 'pending',
      '2': 'approved',
      '3': 'rejected',
    };

    let status: PermissionRequest['status'] | undefined;
    if (type !== undefined) {
      status = statusByType[type];
      if (!status) {
        throw new BadRequestException(
          'type must be 1 (pending), 2 (approved) or 3 (rejected)',
        );
      }
    }

    return this.requestsRepository.find({
      where: {
        ...(status ? { status } : {}),
        permission: {
          system: callerSystemId != null ? { id: callerSystemId } : IsNull(),
        },
      },
      relations: { user: true, permission: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(
    id: number,
    callerSystemId?: number | null,
  ): Promise<PermissionRequest> {
    const request = await this.getById(id);
    if (request.permission.systemId !== (callerSystemId ?? null)) {
      throw new NotFoundException(`Permission request #${id} not found`);
    }
    return request;
  }

  private async getById(id: number): Promise<PermissionRequest> {
    const request = await this.requestsRepository.findOne({
      where: { id },
      relations: { user: true, permission: true, reviewedBy: true },
    });
    if (!request) {
      throw new NotFoundException(`Permission request #${id} not found`);
    }
    return request;
  }

  async review(
    reviewerId: number,
    requestId: number,
    dto: ReviewPermissionRequestDto,
    callerSystemId?: number | null,
  ): Promise<PermissionRequest> {
    const request = await this.findOne(requestId, callerSystemId);
    if (request.status !== 'pending') {
      throw new ConflictException(
        `Request #${requestId} has already been ${request.status}`,
      );
    }

    request.status = dto.decision ? 'approved' : 'rejected';
    request.reviewedBy = { id: reviewerId } as User;
    request.reviewNote = dto.note ?? null;
    request.reviewedAt = new Date();

    await this.requestsRepository.save(request);
    return this.getById(requestId);
  }
}
