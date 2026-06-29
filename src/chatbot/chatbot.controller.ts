import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';
import { Public } from '../auth/public.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  @Post('ask')
  @Public()
  ask(@Body() dto: ChatDto) {
    return this.chatbotService.chat(dto);
  }
}
