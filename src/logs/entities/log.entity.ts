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

export type LogState = 'success' | 'failure';

@Entity('logs')
export class Log {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'user_id' })
  user!: User | null;

  @RelationId((log: Log) => log.user)
  userId!: number | null;

  @Column({ type: 'varchar', length: 100 })
  procedureType!: string;

  @Column({ type: 'enum', enum: ['success', 'failure'], default: 'success' })
  state!: LogState;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  department!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  description!: string | null;

  @CreateDateColumn()
  createdAt!: Date;
}
