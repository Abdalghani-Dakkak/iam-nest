import {
  ConflictException,
  Injectable,
  NotFoundException,
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
    // Re-fetch so the response excludes the password hash (select: false).
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

  // Includes the password hash (column is select:false) for credential checks.
  // Used by AuthService.login — do not return the result directly in a response.
  findByEmailWithPassword(email: string): Promise<User | null> {
    return this.usersRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .leftJoinAndSelect('user.role', 'role')
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
    // roleId present => (re)assign or clear the role; omitted => leave unchanged.
    if (roleId !== undefined) {
      user.role = roleId != null ? await this.resolveRole(roleId) : null;
    }
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
