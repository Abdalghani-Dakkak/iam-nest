import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
    return this.findOne(saved.id);
  }

  findMine(userId: number): Promise<PermissionRequest[]> {
    return this.requestsRepository.find({
      where: { user: { id: userId } },
      relations: { permission: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  findAll(type?: string): Promise<PermissionRequest[]> {
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
      where: status ? { status } : {},
      relations: { user: true, permission: true, reviewedBy: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<PermissionRequest> {
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
  ): Promise<PermissionRequest> {
    const request = await this.findOne(requestId);
    if (request.status !== 'pending') {
      throw new ConflictException(
        `Request #${requestId} has already been ${request.status}`,
      );
    }

    if (dto.decision) {
      await this.grantPermission(request.userId, request.permission);
      request.status = 'approved';
    } else {
      request.status = 'rejected';
    }
    request.reviewedBy = { id: reviewerId } as User;
    request.reviewNote = dto.note ?? null;
    request.reviewedAt = new Date();

    await this.requestsRepository.save(request);
    return this.findOne(requestId);
  }

  private async grantPermission(
    userId: number,
    permission: Permission,
  ): Promise<void> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: { directPermissions: true },
    });
    if (!user) {
      throw new NotFoundException(`User #${userId} not found`);
    }
    if (user.directPermissions.some((p) => p.id === permission.id)) {
      return;
    }
    user.directPermissions.push(permission);
    await this.usersRepository.save(user);
  }
}
