import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { System } from '../../systems/entities/system.entity';

export type LogState = 'success' | 'failure';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @RelationId((log: Log) => log.user)
  userId!: number | null;

  @ManyToOne(() => System, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'system_id' })
  system!: System | null;

  @RelationId((log: Log) => log.system)
  systemId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  procedureType!: string;

  @Column({ type: 'enum', enum: ['success', 'failure'], default: 'success' })
  state!: LogState;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  department!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  description!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ipAddress!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 512 })
  userAgent!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 10 })
  method!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  path!: string | null;

  @Column({ type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata!: Record<string, any> | null;

  @CreateDateColumn()
  createdAt!: Date;
}
