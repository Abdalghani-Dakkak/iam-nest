import { IsInt, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateLogDto {
  @IsOptional()
  @IsInt()
  userId?: number;

  @IsString()
  @MaxLength(100)
  procedureType!: string;

  @IsOptional()
  @IsIn(['success', 'failure'])
  state?: 'success' | 'failure';

  @IsOptional()
  @IsString()
  @MaxLength(255)
  department?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}
