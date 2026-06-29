import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUsersDto } from './dto/query-users.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { roleId, institutionId, departmentId, unitId, password, ...data } =
      createUserDto;
    await this.assertEmailAvailable(data.email);
    const user = this.usersRepository.create(data);
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);

    const institution =
      institutionId != null ? await this.resolveInstitution(institutionId) : null;
    user.institution = institution;
    user.department =
      departmentId != null ? await this.resolveInstitution(departmentId) : null;
    user.unit =
      unitId != null ? await this.resolveInstitution(unitId) : null;

    user.role =
      roleId != null
        ? await this.resolveRole(roleId, institution?.id ?? null)
        : null;

    const saved = await this.usersRepository.save(user);
    return this.findOne(saved.id);
  }

  findAll(query: QueryUsersDto = {}): Promise<User[]> {
    const where: FindOptionsWhere<User> = {};
    if (query.institutionId !== undefined)
      where.institution = { id: query.institutionId };
    if (query.departmentId !== undefined)
      where.department = { id: query.departmentId };
    if (query.unitId !== undefined)
      where.unit = { id: query.unitId };
    if (query.roleId !== undefined) where.role = { id: query.roleId };
    if (query.isActive !== undefined) where.isActive = query.isActive;
    return this.usersRepository.find({
      where,
      relations: { role: true, institution: true, department: true, unit: true },
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: true, institution: true, department: true, unit: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async findWithPermissions(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        role: { permissions: true },
        directPermissions: true,
        institution: true,
        department: true,
        unit: true,
      },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    return user;
  }

  async getUserPermissions(id: number): Promise<{
    rolePermissions: Permission[];
    directPermissions: Permission[];
    effective: Permission[];
  }> {
    const user = await this.findWithPermissions(id);
    const rolePermissions = user.role?.permissions ?? [];
    const directPermissions = user.directPermissions ?? [];

    const byId = new Map<number, Permission>();
    for (const p of rolePermissions) byId.set(p.id, p);
    for (const p of directPermissions) byId.set(p.id, p);

    return { rolePermissions, directPermissions, effective: [...byId.values()] };
  }

  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.role', 'role')
      .leftJoinAndSelect('role.permissions', 'permissions')
      .where('user.email = :email', { email })
      .getOne();
  }

  async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
    const { roleId, institutionId, departmentId, unitId, password, ...data } =
      updateUserDto;
    const user = await this.findOne(id);

    if (data.email && data.email !== user.email) {
      await this.assertEmailAvailable(data.email);
    }
    Object.assign(user, data);

    if (password) {
      user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (institutionId !== undefined) {
      user.institution =
        institutionId != null ? await this.resolveInstitution(institutionId) : null;
    }
    if (departmentId !== undefined) {
      user.department =
        departmentId != null ? await this.resolveInstitution(departmentId) : null;
    }
    if (unitId !== undefined) {
      user.unit =
        unitId != null ? await this.resolveInstitution(unitId) : null;
    }

    if (roleId !== undefined) {
      const effectiveInstitutionId = user.institution?.id ?? null;
      user.role =
        roleId != null
          ? await this.resolveRole(roleId, effectiveInstitutionId)
          : null;
    }

    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async changePassword(
    id: number,
    oldPassword: string,
    newPassword: string,
  ): Promise<User> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id })
      .getOne();
    if (!user) throw new NotFoundException(`User #${id} not found`);
    if (!(await bcrypt.compare(oldPassword, user.password))) {
      throw new UnauthorizedException('Old password is incorrect');
    }
    user.password = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await this.usersRepository.save(user);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const user = await this.findOne(id);
    await this.usersRepository.remove(user);
    return { deleted: true, id };
  }

  async grantPermissions(id: number, permissionIds: number[]): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { directPermissions: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);

    const permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    if (permissions.length !== permissionIds.length) {
      const found = new Set(permissions.map((p) => p.id));
      const missing = permissionIds.filter((pid) => !found.has(pid));
      throw new NotFoundException(`Permission(s) not found: ${missing.join(', ')}`);
    }

    const held = new Set(user.directPermissions.map((p) => p.id));
    for (const p of permissions) {
      if (!held.has(p.id)) user.directPermissions.push(p);
    }
    await this.usersRepository.save(user);
    return this.findWithPermissions(id);
  }

  async revokePermission(id: number, permissionId: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { directPermissions: true },
    });
    if (!user) throw new NotFoundException(`User #${id} not found`);
    user.directPermissions = user.directPermissions.filter(
      (p) => p.id !== permissionId,
    );
    await this.usersRepository.save(user);
    return this.findWithPermissions(id);
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }
  }

  private async resolveInstitution(id: number): Promise<Institution> {
    const inst = await this.institutionsRepository.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`Institution #${id} not found`);
    return inst;
  }

  // Validates that a system-scoped role (role.system.institutionId != null) is
  // only assigned to a user whose institution matches. IAM-native roles (no
  // system) are unrestricted.
  private async resolveRole(
    id: number,
    userInstitutionId: number | null,
  ): Promise<Role> {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: { system: true },
    });
    if (!role) throw new NotFoundException(`Role #${id} not found`);

    const sysInstId = role.system?.institutionId ?? null;
    if (sysInstId != null && sysInstId !== userInstitutionId) {
      throw new BadRequestException(
        `Role "${role.name}" belongs to system "${role.system!.name}" ` +
          `which is owned by a different institution. ` +
          `Assign the user to the correct institution first.`,
      );
    }

    return role;
  }
}
