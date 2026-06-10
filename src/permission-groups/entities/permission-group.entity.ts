import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  JoinTable,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Institution } from '../../institutions/entities/institution.entity';
import { Permission } from '../../permissions/entities/permission.entity';

@Entity('permission_groups')
export class PermissionGroup {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @ManyToOne(() => Institution, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'institution_id' })
  institution!: Institution;

  @RelationId((group: PermissionGroup) => group.institution)
  institutionId!: number;

  @ManyToMany(() => Permission)
  @JoinTable({
    name: 'permission_group_permissions',
    joinColumn: { name: 'permission_group_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permission_id', referencedColumnName: 'id' },
  })
  permissions!: Permission[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
