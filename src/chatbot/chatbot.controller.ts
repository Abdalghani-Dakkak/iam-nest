import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AskQuestionDto } from './dto/ask-question.dto';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // Protected by the global JwtAuthGuard — the frontend sends the user's
  // bearer token. Add @Public() if the chatbot should be usable without login.
  @Post('ask')
  ask(@Body() dto: AskQuestionDto) {
    return this.chatbotService.ask(dto);
  }
}
