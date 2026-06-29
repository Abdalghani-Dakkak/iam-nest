import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LogsService } from './logs.service';
import { LogsController } from './logs.controller';
import { LogsGateway } from './logs.gateway';
import { AuditLogInterceptor } from './audit-log.interceptor';
import { Log } from './entities/log.entity';
import { User } from '../users/entities/user.entity';
import { System } from '../systems/entities/system.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Log, User, System])],
  controllers: [LogsController],
  providers: [
    LogsService,
    LogsGateway,
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
  ],
  exports: [LogsService],
})
export class LogsModule {}
