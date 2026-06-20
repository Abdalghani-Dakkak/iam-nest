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

  /**
   * Flow: front -> IAM (here) -> back2 -> chatbot.
   * Forward { message, history } to back2's POST /chat, wait for its
   * { reply } response, and relay it back to the frontend as-is.
   *
   * Config (env):
   *   CHATBOT_API_URL    back2's chat endpoint, e.g. https://back2.example.com/chat (required)
   *   CHATBOT_API_KEY    optional bearer token sent to back2
   *   CHATBOT_TIMEOUT_MS how long to wait before giving up (default 30000)
   */
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
        // Relay back2's status + body so the caller sees the real reason
        // (e.g. an upstream LLM/Groq error), not a generic message.
        throw new HttpException(
          data ?? { message: 'Chatbot backend returned an error' },
          res.status,
        );
      }
      return data; // { reply: "..." }
    } catch (err) {
      if (err instanceof HttpException) throw err; // relay intentional errors as-is
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
