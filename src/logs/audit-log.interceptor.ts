import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, catchError, tap, throwError } from 'rxjs';
import { LogsService } from './logs.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  constructor(private readonly logsService: LogsService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method: string = req.method;
    const url: string = req.originalUrl || req.url || '';
    const path: string = req.route?.path || url.split('?')[0];

    const isHealth = method === 'GET' && path === '/';
    const isLogin = url.startsWith('/auth/login');
    const isLogsEndpoint = url.startsWith('/logs');
    const skipRead = process.env.AUDIT_LOG_READS === 'false' && method === 'GET';
    if (isHealth || isLogin || isLogsEndpoint || skipRead) {
      return next.handle();
    }

    const xff = req.headers?.['x-forwarded-for'] as string | undefined;
    const base = {
      userId: req.user?.sub as number | undefined,
      systemId: req.user?.systemId as number | undefined,
      procedureType: `${method} ${path}`.slice(0, 100),
      ipAddress: (xff?.split(',')[0]?.trim() || req.ip || undefined)?.slice(
        0,
        45,
      ),
      userAgent: (req.headers?.['user-agent'] as string | undefined)?.slice(
        0,
        512,
      ),
      method,
      path: String(path).slice(0, 255),
    };

    const record = (
      state: 'success' | 'failure',
      statusCode: number | undefined,
      description: string,
    ): void => {
      void this.logsService
        .create({ ...base, state, statusCode, description: description.slice(0, 500) })
        .catch(() => undefined);
    };

    return next.handle().pipe(
      tap(() => record('success', res?.statusCode, `${method} ${url}`)),
      catchError((err) => {
        record(
          'failure',
          (err?.status as number) ?? 500,
          `${method} ${url} -> ${err?.status ?? 'error'}`,
        );
        return throwError(() => err);
      }),
    );
  }
}
