// src/roles/entities/role.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  OneToMany,
  JoinTable,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../users/entities/user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  // Machine/key name (e.g. "system_admin"), unique and used as the role handle.
  @Column({ unique: true, length: 50 })
  name!: string;

  // Arabic display name shown in the UI.
  @Column({ nullable: true, length: 100 })
  arabicName!: string | null;

  // Optional short badge/label text for the role.
  @Column({ nullable: true, length: 255 })
  label!: string | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  // UI accent color (hex or token) used to render the role badge.
  @Column({ nullable: true, length: 20 })
  color!: string | null;

  // System roles are built-in and typically not deletable/editable from the UI.
  @Column({ default: false })
  isSystem!: boolean;

  // Whether assignments of this role carry an expiry date (e.g. contractors).
  @Column({ default: false })
  hasExpiry!: boolean;

  @Column({ default: true })
  isActive!: boolean;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @ManyToMany(() => Permission, (permission) => permission.roles, {
    cascade: false,
  })
  @JoinTable({
    name: 'role_permissions',
    joinColumn: {
      name: 'role_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'permission_id',
      referencedColumnName: 'id',
    },
  })
  permissions!: Permission[];

  // Users that hold this role. Inverse of User.role (single role per user).
  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
