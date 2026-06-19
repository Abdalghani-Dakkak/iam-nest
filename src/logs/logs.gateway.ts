import {
  OnGatewayConnection,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { jwtConstants } from '../auth/constants';
import { JwtPayload } from '../auth/jwt-auth.guard';
import { Log } from './entities/log.entity';

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://iam-gov.vercel.app',
];
const allowedOrigins = (
  process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : defaultOrigins
).map((o) => o.trim());

/**
 * Real-time log stream. Clients connect to the `/logs` namespace with a JWT
 * (the same access token used for REST). Every log written via LogsService is
 * broadcast as a `log:new` event.
 */
@WebSocketGateway({
  namespace: '/logs',
  cors: { origin: allowedOrigins, credentials: true },
})
export class LogsGateway implements OnGatewayConnection {
  private readonly logger = new Logger(LogsGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly jwtService: JwtService) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractToken(client);
    if (!token) {
      client.emit('unauthorized', { message: 'Missing token' });
      client.disconnect();
      return;
    }
    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtConstants.secret,
      });
      client.data.user = payload;
      client.emit('connected', { message: 'Subscribed to logs' });
    } catch {
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  /** Broadcast a newly-created log to all connected clients. */
  emitLog(log: Log): void {
    if (!this.server) return;
    this.server.emit('log:new', log);
  }

  private extractToken(client: Socket): string | undefined {
    const fromAuth = client.handshake.auth?.token as string | undefined;
    if (fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');
    const header = client.handshake.headers?.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
