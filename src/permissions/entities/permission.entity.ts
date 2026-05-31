import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
  CreateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';

@Entity()
export class Permission {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 100 })
  name!: string;

  // Arabic display label for the permission, shown in the UI.
  @Column({ nullable: true, length: 255 })
  label!: string | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  @CreateDateColumn()
  createdAt!: Date;

  @ManyToMany(() => Role, (role) => role.permissions)
  roles!: Role[];
}
