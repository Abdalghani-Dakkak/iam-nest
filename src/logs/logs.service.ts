import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  FindOptionsWhere,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
} from 'typeorm';
import { Log } from './entities/log.entity';
import { User } from '../users/entities/user.entity';
import { CreateLogDto } from './dto/create-log.dto';
import { QueryLogsDto } from './dto/query-logs.dto';
import { LogsGateway } from './logs.gateway';

@Injectable()
export class LogsService {
  constructor(
    @InjectRepository(Log)
    private readonly logsRepository: Repository<Log>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly logsGateway: LogsGateway,
  ) {}

  async create(createLogDto: CreateLogDto): Promise<Log> {
    const { userId, ...data } = createLogDto;
    const log = this.logsRepository.create(data);
    if (userId !== undefined) {
      log.user = await this.resolveUser(userId);
    }
    const saved = await this.logsRepository.save(log);
    this.logsGateway.emitLog(saved);
    return saved;
  }

  findAll(query: QueryLogsDto = {}): Promise<Log[]> {
    const where: FindOptionsWhere<Log> = {};

    if (query.userId !== undefined) {
      where.user = { id: query.userId };
    }
    if (query.procedureType !== undefined) {
      where.procedureType = query.procedureType;
    }
    if (query.state !== undefined) {
      where.state = query.state;
    }
    if (query.department !== undefined) {
      where.department = query.department;
    }

    const dateRange = this.buildDateRange(query.startDate, query.endDate);
    if (dateRange) {
      where.createdAt = dateRange;
    }

    return this.logsRepository.find({
      where,
      relations: { user: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Log> {
    const log = await this.logsRepository.findOne({
      where: { id },
      relations: { user: true },
    });
    if (!log) {
      throw new NotFoundException(`Log #${id} not found`);
    }
    return log;
  }

  private buildDateRange(start?: string, end?: string) {
    if (!start && !end) {
      return undefined;
    }
    const from = start ? new Date(start) : undefined;
    const to = end ? this.endOfRange(end) : undefined;

    if (from && to) {
      return Between(from, to);
    }
    if (from) {
      return MoreThanOrEqual(from);
    }
    return LessThanOrEqual(to!);
  }

  private endOfRange(end: string): Date {
    const date = new Date(end);

    if (!end.includes('T')) {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  }

  private async resolveUser(id: number): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`User #${id} not found`);
    }
    return user;
  }
}
