import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  JoinColumn,
  RelationId,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type InstitutionType =
  | 'governorate'
  | 'directorate'
  | 'department'
  | 'unit';

@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  @Column({
    type: 'enum',
    enum: ['governorate', 'directorate', 'department', 'unit'],
    nullable: true,
  })
  type!: InstitutionType | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  manager!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  managerRole!: string | null;

  @Column({ type: 'int' })
  level!: number;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Institution, (institution) => institution.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Institution | null;

  @RelationId((institution: Institution) => institution.parent)
  parentId!: number | null;

  @OneToMany(() => Institution, (institution) => institution.parent)
  children!: Institution[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
