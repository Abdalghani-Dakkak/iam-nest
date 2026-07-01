import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  ManyToOne,
  JoinColumn,
  RelationId,
  CreateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { System } from '../../systems/entities/system.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 100 })
  name!: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  label!: string | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToOne(() => System, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'system_id' })
  system!: System | null;

  @RelationId((permission: Permission) => permission.system)
  systemId!: number | null;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
