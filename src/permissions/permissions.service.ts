import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Permission } from './entities/permission.entity';
import { System } from '../systems/entities/system.entity';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';

@Injectable()
export class PermissionsService {
  constructor(
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(System)
    private readonly systemsRepository: Repository<System>,
  ) {}

  async create(createPermissionDto: CreatePermissionDto): Promise<Permission> {
    const { systemId, ...data } = createPermissionDto;
    await this.assertNameAvailable(data.name);
    const permission = this.permissionsRepository.create(data);
    if (systemId != null) {
      permission.system = await this.resolveSystem(systemId);
    }
    const saved = await this.permissionsRepository.save(permission);
    return this.findOne(saved.id);
  }

  findAll(systemId?: number | null): Promise<Permission[]> {
    return this.permissionsRepository.find({
      where: systemId != null ? { system: { id: systemId } } : {},
      relations: { system: true },
    });
  }

  async findOne(id: number): Promise<Permission> {
    const permission = await this.permissionsRepository.findOne({
      where: { id },
      relations: { roles: true, system: true },
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
    const { systemId, ...data } = updatePermissionDto;
    const permission = await this.findOne(id);
    if (data.name && data.name !== permission.name) {
      await this.assertNameAvailable(data.name);
    }
    Object.assign(permission, data);
    if (systemId !== undefined) {
      permission.system = systemId != null ? await this.resolveSystem(systemId) : null;
    }
    await this.permissionsRepository.save(permission);
    return this.findOne(id);
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

  private async resolveSystem(id: number): Promise<System> {
    const system = await this.systemsRepository.findOne({ where: { id } });
    if (!system) throw new NotFoundException(`System #${id} not found`);
    return system;
  }
}
