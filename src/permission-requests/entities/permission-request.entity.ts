import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Permission } from '../../permissions/entities/permission.entity';

export type PermissionRequestStatus = 'pending' | 'approved' | 'rejected';

@Entity('permission_requests')
export class PermissionRequest {
  @PrimaryGeneratedColumn()
  id!: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @RelationId((request: PermissionRequest) => request.user)
  userId!: number;

  @ManyToOne(() => Permission, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'permission_id' })
  permission!: Permission;

  @RelationId((request: PermissionRequest) => request.permission)
  permissionId!: number;

  @Column({ type: 'varchar', length: 255 })
  system!: string;

  @Column({ type: 'varchar', length: 100, default: 'permanent' })
  duration!: string;

  @Column({
    type: 'enum',
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  })
  status!: PermissionRequestStatus;

  @Column({ type: 'varchar', length: 500 })
  reason!: string;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'reviewed_by' })
  reviewedBy!: User | null;

  @RelationId((request: PermissionRequest) => request.reviewedBy)
  reviewedById!: number | null;

  @Column({ type: 'varchar', nullable: true, length: 500 })
  reviewNote!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  reviewedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
