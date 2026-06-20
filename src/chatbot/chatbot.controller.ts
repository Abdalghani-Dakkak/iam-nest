import { Body, Controller, Post } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatDto } from './dto/chat.dto';
import { Public } from '../auth/public.decorator';

@Controller('chatbot')
export class ChatbotController {
  constructor(private readonly chatbotService: ChatbotService) {}

  // PUBLIC — front sends { message, history }; we relay back2's { reply }.
  @Post('ask')
  @Public()
  ask(@Body() dto: ChatDto) {
    return this.chatbotService.chat(dto);
  }
}
