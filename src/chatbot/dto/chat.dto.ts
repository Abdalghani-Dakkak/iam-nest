import { IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ChatDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  message!: string;

  // Conversation history forwarded to back2 as-is, e.g.
  // [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }]
  @IsArray()
  @IsOptional()
  history?: unknown[];
}
