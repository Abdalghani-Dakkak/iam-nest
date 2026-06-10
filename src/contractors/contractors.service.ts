import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Contractor } from './entities/contractor.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { PermissionGroup } from '../permission-groups/entities/permission-group.entity';
import { CreateContractorDto } from './dto/create-contractor.dto';
import { EndContractDto } from './dto/end-contract.dto';
import { ExtendContractDto } from './dto/extend-contract.dto';

@Injectable()
export class ContractorsService {
  constructor(
    @InjectRepository(Contractor)
    private readonly contractorsRepository: Repository<Contractor>,
    @InjectRepository(Institution)
    private readonly institutionsRepository: Repository<Institution>,
    @InjectRepository(PermissionGroup)
    private readonly permissionGroupsRepository: Repository<PermissionGroup>,
  ) {}

  async create(createDto: CreateContractorDto): Promise<Contractor> {
    const { institutionIds, permissionGroupId, ...data } = createDto;
    const contractor = this.contractorsRepository.create(data);
    contractor.institutions = await this.resolveInstitutions(institutionIds);
    contractor.permissionGroup =
      await this.resolvePermissionGroup(permissionGroupId);
    const saved = await this.contractorsRepository.save(contractor);
    return this.findOne(saved.id);
  }

  findAll(): Promise<Contractor[]> {
    return this.contractorsRepository.find({
      relations: { institutions: true, permissionGroup: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Contractor> {
    const contractor = await this.contractorsRepository.findOne({
      where: { id },
      relations: { institutions: true, permissionGroup: true },
    });
    if (!contractor) {
      throw new NotFoundException(`Contractor #${id} not found`);
    }
    return contractor;
  }

  async endContract(id: number, dto: EndContractDto): Promise<Contractor> {
    const contractor = await this.findOne(id);
    if (contractor.status === 'ended') {
      throw new ConflictException(
        `Contractor #${id} contract has already been ended`,
      );
    }
    contractor.status = 'ended';
    contractor.isActive = false;
    contractor.endReason = dto.reason;
    contractor.endedAt = new Date();
    await this.contractorsRepository.save(contractor);
    return this.findOne(id);
  }

  async extendContract(
    id: number,
    dto: ExtendContractDto,
  ): Promise<Contractor> {
    const contractor = await this.findOne(id);
    if (contractor.status === 'ended') {
      throw new ConflictException(`Contractor #${id} contract has ended`);
    }
    if (new Date(dto.newEndDate) <= new Date(contractor.endDate)) {
      throw new BadRequestException(
        `newEndDate must be after the current end date (${contractor.endDate})`,
      );
    }
    contractor.endDate = dto.newEndDate;
    contractor.extensionReason = dto.reason;
    contractor.extendedAt = new Date();
    await this.contractorsRepository.save(contractor);
    return this.findOne(id);
  }

  async toggleActive(id: number): Promise<Contractor> {
    const contractor = await this.findOne(id);
    contractor.isActive = !contractor.isActive;
    await this.contractorsRepository.save(contractor);
    return this.findOne(id);
  }

  private async resolveInstitutions(ids: number[]): Promise<Institution[]> {
    const institutions = await this.institutionsRepository.findBy({
      id: In(ids),
    });
    if (institutions.length !== ids.length) {
      const found = new Set(institutions.map((i) => i.id));
      const missing = ids.filter((id) => !found.has(id));
      throw new NotFoundException(
        `Institution(s) not found: ${missing.join(', ')}`,
      );
    }
    return institutions;
  }

  private async resolvePermissionGroup(id: number): Promise<PermissionGroup> {
    const group = await this.permissionGroupsRepository.findOne({
      where: { id },
    });
    if (!group) {
      throw new NotFoundException(`Permission group #${id} not found`);
    }
    return group;
  }
}
