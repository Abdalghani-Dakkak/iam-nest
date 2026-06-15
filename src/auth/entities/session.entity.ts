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

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @RelationId((session: Session) => session.user)
  userId!: number;

  @Column({ type: 'varchar', nullable: true, length: 45 })
  ipAddress!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 512 })
  userAgent!: string | null;

  @Column({ type: 'timestamp' })
  expiresAt!: Date;

  @Column({ default: false })
  revoked!: boolean;

  @Column({ type: 'timestamp' })
  lastActiveAt!: Date;

  @CreateDateColumn()
  createdAt!: Date;
}
