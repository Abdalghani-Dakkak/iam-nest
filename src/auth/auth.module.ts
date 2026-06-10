import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UsersModule } from '../users/users.module';
import { LogsModule } from '../logs/logs.module';
import { AuthService } from './auth.service';
import { SessionsService } from './sessions.service';
import { AuthController } from './auth.controller';
import { JwtAuthGuard } from './jwt-auth.guard';
import { Session } from './entities/session.entity';
import { jwtConstants } from './constants';

@Module({
  imports: [
    UsersModule,
    LogsModule,
    TypeOrmModule.forFeature([Session]),
    JwtModule.register({
      global: true,
      secret: jwtConstants.secret,
      signOptions: { expiresIn: jwtConstants.expiresIn },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionsService,

    { provide: APP_GUARD, useClass: JwtAuthGuard },
  ],
})
export class AuthModule {}
