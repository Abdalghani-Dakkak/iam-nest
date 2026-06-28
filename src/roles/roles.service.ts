import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Like, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
  ) {}

  async create(createRoleDto: CreateRoleDto): Promise<Role> {
    const { permissionIds, ...data } = createRoleDto;
    await this.assertNameAvailable(data.name);
    const role = this.rolesRepository.create(data);
    if (permissionIds) {
      role.permissions = await this.resolvePermissions(permissionIds);
    }
    return this.rolesRepository.save(role);
  }

  findAll(scope?: string | null): Promise<Role[]> {
    return this.rolesRepository.find({
      where: scope ? { name: Like(`${scope}%`) } : {},
      relations: { permissions: true },
    });
  }

  async findOne(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { permissions: true },
    });
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return role;
  }

  async update(id: number, updateRoleDto: UpdateRoleDto): Promise<Role> {
    const { permissionIds, ...data } = updateRoleDto;
    const role = await this.findOne(id);
    if (data.name && data.name !== role.name) {
      await this.assertNameAvailable(data.name);
    }
    Object.assign(role, data);
    if (permissionIds) {
      role.permissions = await this.resolvePermissions(permissionIds);
    }
    return this.rolesRepository.save(role);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const role = await this.findOne(id);
    await this.rolesRepository.remove(role);
    return { deleted: true, id };
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.rolesRepository.findOne({ where: { name } });
    if (existing) {
      throw new ConflictException(`Role "${name}" already exists`);
    }
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
