import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class AskQuestionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  question!: string;
}
