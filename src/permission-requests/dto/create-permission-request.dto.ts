import {
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePermissionRequestDto {
  @IsString()
  @MaxLength(255)
  system!: string;

  @IsInt()
  permissionId!: number;

  @IsString()
  @MaxLength(500)
  reason!: string;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
