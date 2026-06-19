import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { AskQuestionDto } from './dto/ask-question.dto';
import { Public } from '../auth/public.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // PUBLIC — anyone can ask the bot without logging in.
  @Post('ask')
  @Public()
  ask(@Body() dto: AskQuestionDto) {
    return this.chatbotService.ask(dto);
  }
}
