import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { System } from './entities/system.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { CreateSystemDto } from './dto/create-system.dto';
import { UpdateSystemDto } from './dto/update-system.dto';

@Injectable()
export class SystemsService {
  constructor(
    @InjectRepository(System)
    private readonly systemsRepository: Repository<System>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
  ) {}

  async create(dto: CreateSystemDto): Promise<System> {
    await this.assertNameAvailable(dto.name);
    const system = this.systemsRepository.create(dto);
    if (dto.institutionId != null) {
      system.institution = await this.resolveInstitution(dto.institutionId);
    }
    const saved = await this.systemsRepository.save(system);
    return this.findOne(saved.id);
  }

  findAll(): Promise<System[]> {
    return this.systemsRepository.find({
      relations: { institution: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<System> {
    const system = await this.systemsRepository.findOne({
      where: { id },
      relations: { institution: true },
    });
    if (!system) throw new NotFoundException(`System #${id} not found`);
    return system;
  }

  async update(id: number, dto: UpdateSystemDto): Promise<System> {
    const system = await this.findOne(id);
    if (dto.name && dto.name !== system.name) {
      await this.assertNameAvailable(dto.name);
    }
    const { institutionId, ...data } = dto;
    Object.assign(system, data);
    if (institutionId !== undefined) {
      system.institution =
        institutionId != null ? await this.resolveInstitution(institutionId) : null;
    }
    await this.systemsRepository.save(system);
    return this.findOne(id);
  }

  async remove(id: number): Promise<{ deleted: true; id: number }> {
    const system = await this.findOne(id);
    await this.systemsRepository.remove(system);
    return { deleted: true, id };
  }

  private async assertNameAvailable(name: string): Promise<void> {
    const existing = await this.systemsRepository.findOne({ where: { name } });
    if (existing) throw new ConflictException(`System "${name}" already exists`);
  }

  private async resolveInstitution(id: number): Promise<Institution> {
    const inst = await this.institutionsRepository.findOne({ where: { id } });
    if (!inst) throw new NotFoundException(`Institution #${id} not found`);
    return inst;
  }
}
