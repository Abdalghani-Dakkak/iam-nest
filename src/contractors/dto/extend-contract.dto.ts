import { IsDateString, IsString, MaxLength } from 'class-validator';

export class ExtendContractDto {
  @IsDateString()
  newEndDate!: string;

  @IsString()
  @MaxLength(500)
  reason!: string;
}
