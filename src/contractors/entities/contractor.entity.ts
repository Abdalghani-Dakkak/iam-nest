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
import { PermissionGroup } from '../../permission-groups/entities/permission-group.entity';

@Entity('contractors')
export class Contractor {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  fullName!: string;

  @Column({ length: 255 })
  email!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  representedEntity!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  guarantor!: string | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  contractObjective!: string | null;

  @Column({ type: 'date' })
  startDate!: string;

  @Column({ type: 'date' })
  endDate!: string;

  @Column({ default: true })
  isActive!: boolean;

  @Column({
    type: 'enum',
    enum: ['active', 'ended'],
    default: 'active',
  })
  status!: 'active' | 'ended';

  @Column({ type: 'varchar', length: 500, nullable: true })
  endReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  endedAt!: Date | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  extensionReason!: string | null;

  @Column({ type: 'timestamp', nullable: true })
  extendedAt!: Date | null;

  @ManyToMany(() => Institution)
  @JoinTable({
    name: 'contractor_institutions',
    joinColumn: { name: 'contractor_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'institution_id', referencedColumnName: 'id' },
  })
  institutions!: Institution[];

  @ManyToOne(() => PermissionGroup, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'permission_group_id' })
  permissionGroup!: PermissionGroup | null;

  @RelationId((contractor: Contractor) => contractor.permissionGroup)
  permissionGroupId!: number | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
