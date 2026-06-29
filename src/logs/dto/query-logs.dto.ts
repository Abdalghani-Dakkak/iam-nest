import { Type } from 'class-transformer';
import {
  IsDateString,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class QueryLogsDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  systemId?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  procedureType?: string;

  @IsOptional()
  @IsIn(['success', 'failure'])
  state?: 'success' | 'failure';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;
}
