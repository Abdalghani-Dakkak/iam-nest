import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { System } from '../systems/entities/system.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(System)
    private readonly systemsRepository: Repository<System>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { permissionIds, systemId, ...data } = createRoleDto;
    await this.assertNameAvailable(data.name);
    const role = this.rolesRepository.create(data);
    if (permissionIds) {
      role.permissions = await this.resolvePermissions(permissionIds);
    }
    if (systemId != null) {
      role.system = await this.resolveSystem(systemId);
    }
    const saved = await this.rolesRepository.save(role);
    return this.findOne(saved.id);
  }

  findAll(systemId?: number | null): Promise<Role[]> {
    return this.rolesRepository.find({
      where: systemId != null ? { system: { id: systemId } } : {},
      relations: { permissions: true, system: true },
    });
  }

  findByInstitution(institutionId: number): Promise<Role[]> {
    return this.rolesRepository.find({
      where: { system: { institution: { id: institutionId } } },
      relations: { permissions: true, system: true },
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { permissions: true, system: true },
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const { permissionIds, systemId, ...data } = updateRoleDto;
    const role = await this.findOne(id);
    if (role.isSystem && data.name && data.name !== role.name) {
      throw new ForbiddenException(
        `Role "${role.name}" is a system role and cannot be renamed`,
      );
    }
    if (data.name && data.name !== role.name) {
      await this.assertNameAvailable(data.name);
    }
    Object.assign(role, data);
    if (permissionIds) {
      role.permissions = await this.resolvePermissions(permissionIds);
    }
    if (systemId !== undefined) {
      role.system = systemId != null ? await this.resolveSystem(systemId) : null;
    }
    return this.rolesRepository.save(role);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const role = await this.findOne(id);
    if (role.isSystem) {
      throw new ForbiddenException(
        `Role "${role.name}" is a system role and cannot be deleted`,
      );
    }
    await this.rolesRepository.remove(role);
    return { deleted: true, id };
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.rolesRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }
  }

  private async resolveSystem(id: number): Promise<System> {
    const system = await this.systemsRepository.findOne({ where: { id } });
    if (!system) throw new NotFoundException(`System #${id} not found`);
    return system;
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
