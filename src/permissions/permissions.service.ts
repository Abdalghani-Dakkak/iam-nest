import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    await this.assertNameAvailable(createPermissionDto.name);
    const permission = this.permissionsRepository.create(createPermissionDto);
    return this.permissionsRepository.save(permission);
  }

  findAll(scope?: string | null): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: scope ? { name: Like(`${scope}%`) } : {},
    });
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: { roles: true },
    });
    if (!permission) {
      throw new NotFoundException(`Permission #${id} not found`);
    }
    return permission;
  }

  async update(
    id: number,
    updatePermissionDto: UpdatePermissionDto,
  ): Promise<Permission> {
    const permission = await this.findOne(id);
    if (
      updatePermissionDto.name &&
      updatePermissionDto.name !== permission.name
    ) {
      await this.assertNameAvailable(updatePermissionDto.name);
    }
    Object.assign(permission, updatePermissionDto);
    return this.permissionsRepository.save(permission);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const permission = await this.findOne(id);
    await this.permissionsRepository.remove(permission);
    return { deleted: true, id };
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.permissionsRepository.findOne({
      where: { name },
    });
    if (existing) {
      throw new ConflictException(`Permission "${name}" already exists`);
    }
  }
}
