import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEmail,
  IsInt,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateContractorDto {
  @IsString()
  @MaxLength(255)
  fullName!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MaxLength(255)
  representedEntity!: string;

  @IsString()
  @MaxLength(255)
  guarantor!: string;

  @IsString()
  @MaxLength(500)
  contractObjective!: string;

  @IsDateString()
  startDate!: string;

  @IsDateString()
  endDate!: string;

  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsInt({ each: true })
  institutionIds!: number[];

  @IsInt()
  permissionGroupId!: number;
}
