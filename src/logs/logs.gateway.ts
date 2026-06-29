import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
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

// Same filters supported by GET /logs, but applied live per connected client.
interface LogFilter {
  userId?: number;
  procedureType?: string;
  state?: string;
  department?: string;
}

// Shape of the socket.io handshake auth object we expect from clients.
interface HandshakeAuth {
  token?: string;
  filter?: unknown;
}

/**
 * Real-time log stream on the `/logs` namespace. Clients connect with a JWT
 * (same access token as REST). A new log is pushed as a `log:new` event only
 * to clients whose filter matches it — so a dashboard can stream just one
 * user's logs, only failures, etc. No filter ⇒ receive everything.
 *
 * Set a filter either in the handshake (`auth: { filter: {...} }`) or live via
 * the `subscribe` event; clear it with `unsubscribe`.
 */
@WebSocketGateway({
  namespace: '/logs',
  cors: { origin: allowedOrigins, credentials: true },
})
export class LogsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(LogsGateway.name);
  private readonly clients = new Map<string, Socket>();
  // Per-client filter stored separately to avoid socket.data's `any` type.
  private readonly clientFilters = new Map<string, LogFilter>();

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
      await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: jwtConstants.secret,
      });
      const auth = client.handshake.auth as HandshakeAuth;
      const filter = this.normalizeFilter(auth.filter);
      if (filter) this.clientFilters.set(client.id, filter);
      this.clients.set(client.id, client);
      client.emit('connected', {
        message: 'Subscribed to logs',
        filter: filter ?? null,
      });
    } catch {
      client.emit('unauthorized', { message: 'Invalid or expired token' });
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    this.clients.delete(client.id);
    this.clientFilters.delete(client.id);
  }

  /** Set/replace this client's live filter. */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() filter: unknown,
  ): void {
    const f = this.normalizeFilter(filter);
    if (f) {
      this.clientFilters.set(client.id, f);
    } else {
      this.clientFilters.delete(client.id);
    }
    client.emit('subscribed', { filter: f ?? null });
  }

  /** Clear the filter — receive all logs again. */
  @SubscribeMessage('unsubscribe')
  handleUnsubscribe(@ConnectedSocket() client: Socket): void {
    this.clientFilters.delete(client.id);
    client.emit('subscribed', { filter: null });
  }

  /** Push a newly-created log to every client whose filter matches it. */
  emitLog(log: Log): void {
    for (const [id, socket] of this.clients) {
      if (this.matchesFilter(log, this.clientFilters.get(id))) {
        socket.emit('log:new', log);
      }
    }
  }

  private matchesFilter(log: Log, filter?: LogFilter): boolean {
    if (!filter) return true;
    const logUserId = log.user?.id ?? log.userId ?? null;
    if (filter.userId !== undefined && logUserId !== filter.userId)
      return false;

    if (
      filter.procedureType !== undefined &&
      log.procedureType !== filter.procedureType
    )
      return false;
    if (filter.state !== undefined && log.state !== filter.state) return false;
    if (
      filter.department !== undefined &&
      (log.department ?? null) !== filter.department
    )
      return false;
    return true;
  }

  private normalizeFilter(raw: unknown): LogFilter | undefined {
    if (!raw || typeof raw !== 'object') return undefined;
    const r = raw as Record<string, unknown>;
    const f: LogFilter = {};
    if (r.userId !== undefined && r.userId !== null && r.userId !== '') {
      const n = Number(r.userId);
      if (!Number.isNaN(n)) f.userId = n;
    }
    if (typeof r.procedureType === 'string') f.procedureType = r.procedureType;
    if (typeof r.state === 'string') f.state = r.state;
    if (typeof r.department === 'string') f.department = r.department;
    return Object.keys(f).length ? f : undefined;
  }

  private extractToken(client: Socket): string | undefined {
    const auth = client.handshake.auth as HandshakeAuth;
    const fromAuth = auth.token;
    if (fromAuth) return fromAuth.replace(/^Bearer\s+/i, '');
    const header = client.handshake.headers?.authorization;
    return header?.startsWith('Bearer ') ? header.slice(7) : undefined;
  }
}
