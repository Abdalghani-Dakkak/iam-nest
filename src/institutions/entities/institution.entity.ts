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

// The organizational tier of an institution node. Mirrors the front-end's tree
// (governorate at the root, then directorate / department / unit going down).
export type InstitutionType =
  | 'governorate'
  | 'directorate'
  | 'department'
  | 'unit';

// Organizational hierarchy stored as a single-table adjacency list: every node
// is an `institution` row, linked to its parent via `parent_id`. `level` is the
// depth in the tree (roots = 1, each child = parent.level + 1) and is managed by
// the service, never set by clients.
@Entity('institutions')
export class Institution {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  name!: string;

  // Organizational tier label. Independent of `level` (the numeric depth):
  // `type` is the human category, `level` is computed from tree position.
  @Column({
    type: 'enum',
    enum: ['governorate', 'directorate', 'department', 'unit'],
    nullable: true,
  })
  type!: InstitutionType | null;

  @Column({ nullable: true, length: 255 })
  description!: string;

  // Display name of the person heading this institution.
  @Column({ nullable: true, length: 255 })
  manager!: string | null;

  // Job title / role of the manager (e.g. "مدير عام").
  @Column({ nullable: true, length: 255 })
  managerRole!: string | null;

  @Column({ type: 'int' })
  level!: number;

  @Column({ default: true })
  isActive!: boolean;

  // Parent link. NULL for a root (top-level) institution. RESTRICT is a DB-level
  // backstop for the service's "block delete while children exist" rule.
  @ManyToOne(() => Institution, (institution) => institution.children, {
    nullable: true,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'parent_id' })
  parent!: Institution | null;

  // Read-only mirror of the FK, populated on every load without fetching the
  // parent entity — lets clients walk the tree from a flat list.
  @RelationId((institution: Institution) => institution.parent)
  parentId!: number | null;

  @OneToMany(() => Institution, (institution) => institution.parent)
  children!: Institution[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
