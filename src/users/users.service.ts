import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';

const BCRYPT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    const { roleId, password, ...data } = createUserDto;
    await this.assertEmailAvailable(data.email);
    const user = this.usersRepository.create(data);
    user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    user.role = roleId != null ? await this.resolveRole(roleId) : null;
    const saved = await this.usersRepository.save(user);

    return this.findOne(saved.id);
  }

  findAll(): Promise<User[]> {
    return this.usersRepository.find({ relations: { role: true } });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: true },
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }

  async findWithPermissions(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: { role: { permissions: true }, directPermissions: true },
    });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
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
    const { roleId, password, ...data } = updateUserDto;
    const user = await this.findOne(id);
    if (data.email && data.email !== user.email) {
      await this.assertEmailAvailable(data.email);
    }
    Object.assign(user, data);
    if (password) {
      user.password = await bcrypt.hash(password, BCRYPT_ROUNDS);
    }

    if (roleId !== undefined) {
      user.role = roleId != null ? await this.resolveRole(roleId) : null;
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
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
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

  private async assertEmailAvailable(email: string): Promise<void> {
    const existing = await this.usersRepository.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException(`User with email "${email}" already exists`);
    }
  }

  private async resolveRole(id: number): Promise<Role> {
    const role = await this.rolesRepository.findOne({ where: { id } });
    if (!role) {
      throw new NotFoundException(`Role #${id} not found`);
    }
    return role;
  }
}
