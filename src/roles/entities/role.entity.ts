import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinTable,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Permission } from '../../permissions/entities/permission.entity';
import { User } from '../../users/entities/user.entity';
import { System } from '../../systems/entities/system.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  name!: string;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  arabicName!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  label!: string | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  @Column({ type: 'varchar', nullable: true, length: 20 })
  color!: string | null;

  @Column({ default: false })
  isSystem!: boolean;

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

  @ManyToOne(() => System, (system) => system.roles, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'system_id' })
  system!: System | null;

  @RelationId((role: Role) => role.system)
  systemId!: number | null;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
