import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { PermissionGroup } from './entities/permission-group.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreatePermissionGroupDto } from './dto/create-permission-group.dto';
import { UpdatePermissionGroupDto } from './dto/update-permission-group.dto';

@Injectable()
export class PermissionGroupsService {
  constructor(
    @InjectRepository(PermissionGroup)
    private readonly groupsRepository: Repository<PermissionGroup>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(createDto: CreatePermissionGroupDto): Promise<PermissionGroup> {
    const { institutionId, permissionIds, ...data } = createDto;
    const group = this.groupsRepository.create(data);
    group.institution = await this.resolveInstitution(institutionId);
    group.permissions = await this.resolvePermissions(permissionIds);
    const saved = await this.groupsRepository.save(group);
    return this.findOne(saved.id);
  }

  async findAll(institutionId?: string): Promise<PermissionGroup[]> {
    let where: { institution?: { id: number } } = {};
    if (institutionId !== undefined) {
      const id = Number(institutionId);
      if (!Number.isInteger(id) || id <= 0) {
        throw new BadRequestException(
          'institutionId must be a positive integer',
        );
      }
      await this.resolveInstitution(id);
      where = { institution: { id } };
    }

    return this.groupsRepository.find({
      where,
      relations: { institution: true, permissions: true },
    });
  }

  async findOne(id: number): Promise<PermissionGroup> {
    const group = await this.groupsRepository.findOne({
      where: { id },
      relations: { institution: true, permissions: true },
    });
    if (!group) {
      throw new NotFoundException(`Permission group #${id} not found`);
    }
    return group;
  }

  async update(
    id: number,
    updateDto: UpdatePermissionGroupDto,
  ): Promise<PermissionGroup> {
    const { institutionId, permissionIds, ...data } = updateDto;
    const group = await this.findOne(id);
    Object.assign(group, data);
    if (institutionId !== undefined) {
      group.institution = await this.resolveInstitution(institutionId);
    }
    if (permissionIds) {
      group.permissions = await this.resolvePermissions(permissionIds);
    }
    await this.groupsRepository.save(group);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const group = await this.findOne(id);
    await this.groupsRepository.remove(group);
    return { deleted: true, id };
  }

  private async resolveInstitution(id: number): Promise<Institution> {
    const institution = await this.institutionsRepository.findOne({
      where: { id },
    });
    if (!institution) {
      throw new NotFoundException(`Institution #${id} not found`);
    }
    return institution;
  }

  private async resolvePermissions(ids: number[]): Promise<Permission[]> {
    if (ids.length === 0) {
      return [];
    }
    const permissions = await this.permissionsRepository.findBy({
      id: In(ids),
    });
    if (permissions.length !== ids.length) {
      const found = new Set(permissions.map((p) => p.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Permission(s) not found: ${missing.join(', ')}`,
      );
    }
    return permissions;
  }
}
