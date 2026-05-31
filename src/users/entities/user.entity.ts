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
import { Role } from '../../roles/entities/role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 255 })
  email!: string;

  // Login handle, kept distinct from the display name (fullName) because the
  // JWT payload carries it.
  @Column({ length: 100 })
  username!: string;

  @Column({ nullable: true, length: 255 })
  fullName!: string | null;

  @Column({ unique: true, nullable: true, length: 20 })
  nationalId!: string | null;

  // select: false keeps the hash out of every query result by default.
  @Column({ select: false })
  password!: string;

  @Column({ nullable: true, length: 255 })
  department!: string | null;

  @Column({ nullable: true, length: 255 })
  unit!: string | null;

  @Column({ nullable: true, length: 255 })
  jobTitle!: string | null;

  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastLogin!: Date | null;

  @Column({ nullable: true, length: 255 })
  avatar!: string | null;

  // For contractor accounts: the date their access expires.
  @Column({ type: 'date', nullable: true })
  contractExpiry!: string | null;

  @Column({ nullable: true, length: 255 })
  suspendedReason!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Each user has a single role (FK role_id), NULL until one is assigned.
  // SET NULL on delete so removing a role doesn't block while users reference it.
  @ManyToOne(() => Role, (role) => role.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  // Read-only mirror of the FK, populated on every load without fetching the
  // role entity.
  @RelationId((user: User) => user.role)
  roleId!: number | null;
}
