import {
  BadGatewayException,
  GatewayTimeoutException,
  HttpException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  async chat(dto: ChatDto): Promise<unknown> {
    const url = process.env.CHATBOT_API_URL;
    if (!url) {
      throw new ServiceUnavailableException('Chatbot is not configured');
    }

    const timeoutMs = Number(process.env.CHATBOT_TIMEOUT_MS ?? 30000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.CHATBOT_API_KEY
            ? { Authorization: `Bearer ${process.env.CHATBOT_API_KEY}` }
            : {}),
        },
        body: JSON.stringify({
          message: dto.message,
          history: dto.history ?? [],
        }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        this.logger.error(`back2 /chat ${res.status}: ${JSON.stringify(data)}`);
        throw new HttpException(
          data ?? { message: 'Chatbot backend returned an error' },
          res.status,
        );
      }
      return data;
    } catch (err) {
      if (err instanceof HttpException) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GatewayTimeoutException('Chatbot took too long to respond');
      }
      this.logger.error(
        'Chatbot request failed',
        err instanceof Error ? err.stack : String(err),
      );
      throw new BadGatewayException('Could not reach the chatbot backend');
    } finally {
      clearTimeout(timer);
    }
  }
}
