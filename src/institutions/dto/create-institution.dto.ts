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

  @IsOptional()
  @IsInt()
  @Min(1)
  parentId?: number | null;
}
