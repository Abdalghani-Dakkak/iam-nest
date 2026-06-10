import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewPermissionRequestDto {
  @IsBoolean()
  decision!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string;
}
