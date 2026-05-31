import {
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import type { InstitutionType } from '../entities/institution.entity';

export class CreateInstitutionDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  // Organizational tier. `level` (numeric depth) is still derived from the tree.
  @IsOptional()
  @IsIn(['governorate', 'directorate', 'department', 'unit'])
  type?: InstitutionType;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  manager?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  managerRole?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // Parent institution id. Omit (or send null) to create a top-level root.
  // `level` is derived from the parent and must NOT be sent.
  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
