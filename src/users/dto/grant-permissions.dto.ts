import { ArrayNotEmpty, IsArray, IsInt } from 'class-validator';

export class GrantPermissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  permissionIds!: number[];
}
