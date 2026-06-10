import {
  ArrayUnique,
  IsArray,
  IsInt,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreatePermissionGroupDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsInt()
  institutionId!: number;

  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  permissionIds!: number[];
}
