import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 255 })
  email!: string;

  @Column({ length: 100 })
  username!: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  fullName!: string | null;

  @Column({ type: 'varchar', unique: true, nullable: true, length: 20 })
  nationalId!: string | null;

  @Column({ select: false })
  password!: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  department!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  unit!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  jobTitle!: string | null;

  @Column({ type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ type: 'datetime', nullable: true })
  lastLogin!: Date | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  avatar!: string | null;

  @Column({ type: 'date', nullable: true })
  contractExpiry!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  suspendedReason!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToOne(() => Role, (role) => role.users, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'role_id' })
  role!: Role | null;

  @RelationId((user: User) => user.role)
  roleId!: number | null;

  @ManyToMany(() => Permission, { cascade: false })
  @JoinTable({
    name: 'user_permissions',
    joinColumn: { name: 'user_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  directPermissions!: Permission[];
}
