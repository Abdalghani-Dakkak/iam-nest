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
import { Institution } from '../../institutions/entities/institution.entity';
import { Role } from '../../roles/entities/role.entity';

@Entity('systems')
export class System {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ unique: true, length: 50 })
  name!: string;

  @Column({ type: 'varchar', nullable: true, length: 100 })
  arabicName!: string | null;

  @Column({ type: 'varchar', nullable: true, length: 255 })
  description!: string | null;

  @Column({ default: true })
  isActive!: boolean;

  @ManyToOne(() => Institution, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'institution_id' })
  institution!: Institution | null;

  @RelationId((s: System) => s.institution)
  institutionId!: number | null;

  @OneToMany(() => Role, (role) => role.system)
  roles!: Role[];

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;
}
