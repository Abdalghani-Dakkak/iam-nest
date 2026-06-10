import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThan, Repository } from 'typeorm';
import { Session } from './entities/session.entity';
import { User } from '../users/entities/user.entity';

export interface SessionMeta {
  ipAddress?: string | null;
  userAgent?: string | null;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(Session)
    private readonly sessionsRepository: Repository<Session>,
  ) {}

  create(user: User, expiresAt: Date, meta: SessionMeta): Promise<Session> {
    const session = this.sessionsRepository.create({
      user,
      ipAddress: meta.ipAddress ?? null,
      userAgent: meta.userAgent ?? null,
      expiresAt,
      lastActiveAt: new Date(),
      revoked: false,
    });
    return this.sessionsRepository.save(session);
  }

  async findLive(id: number, userId: number): Promise<Session | null> {
    const session = await this.sessionsRepository.findOne({ where: { id } });
    if (
      !session ||
      session.revoked ||
      session.userId !== userId ||
      session.expiresAt.getTime() <= Date.now()
    ) {
      return null;
    }
    return session;
  }

  async touch(session: Session): Promise<void> {
    session.lastActiveAt = new Date();
    await this.sessionsRepository.save(session);
  }

  findActiveForUser(userId: number): Promise<Session[]> {
    return this.sessionsRepository.find({
      where: {
        user: { id: userId },
        revoked: false,
        expiresAt: MoreThan(new Date()),
      },
      order: { lastActiveAt: 'DESC' },
    });
  }

  async end(userId: number, id: number): Promise<void> {
    const session = await this.sessionsRepository.findOne({ where: { id } });
    if (!session || session.userId !== userId) {
      throw new NotFoundException(`Session #${id} not found`);
    }
    session.revoked = true;
    await this.sessionsRepository.save(session);
  }

  async endAll(userId: number, exceptId?: number): Promise<number> {
    const qb = this.sessionsRepository
      .createQueryBuilder()
      .update(Session)
      .set({ revoked: true })
      .where('user_id = :userId', { userId })
      .andWhere('revoked = false');
    if (exceptId !== undefined) {
      qb.andWhere('id != :exceptId', { exceptId });
    }
    const result = await qb.execute();
    return result.affected ?? 0;
  }
}
