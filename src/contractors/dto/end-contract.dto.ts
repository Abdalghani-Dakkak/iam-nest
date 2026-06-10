import { IsString, MaxLength } from 'class-validator';

export class EndContractDto {
  @IsString()
  @MaxLength(500)
  reason!: string;
}
