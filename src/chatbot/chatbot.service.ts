import {
  BadGatewayException,
  GatewayTimeoutException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AskQuestionDto } from './dto/ask-question.dto';

@Injectable()
export class ChatbotService {
  private readonly logger = new Logger(ChatbotService.name);

  /**
   * Forward the question to the external chatbot API, wait for its answer,
   * and return the chatbot's response as-is to the caller.
   *
   * Config (env):
   *   CHATBOT_API_URL        the chatbot endpoint to POST to (required)
   *   CHATBOT_API_KEY        optional bearer token sent to the chatbot
   *   CHATBOT_QUESTION_FIELD JSON field name for the question (default "question")
   *   CHATBOT_TIMEOUT_MS     how long to wait before giving up (default 30000)
   */
  async ask(dto: AskQuestionDto): Promise<unknown> {
    const url = process.env.CHATBOT_API_URL;
    if (!url) {
      throw new ServiceUnavailableException('Chatbot is not configured');
    }

    const field = process.env.CHATBOT_QUESTION_FIELD || 'question';
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
        body: JSON.stringify({ [field]: dto.question }),
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.logger.error(`Chatbot API ${res.status}: ${JSON.stringify(data)}`);
        throw new BadGatewayException('Chatbot API returned an error');
      }
      return data;
    } catch (err) {
      if (err instanceof BadGatewayException) throw err;
      if (err instanceof Error && err.name === 'AbortError') {
        throw new GatewayTimeoutException('Chatbot took too long to respond');
      }
      this.logger.error(
        'Chatbot request failed',
        err instanceof Error ? err.stack : String(err),
      );
      throw new BadGatewayException('Could not reach the chatbot');
    } finally {
      clearTimeout(timer);
    }
  }
}
