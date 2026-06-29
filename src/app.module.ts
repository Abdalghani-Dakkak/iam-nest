import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { SystemsModule } from './systems/systems.module';
import { LogsModule } from './logs/logs.module';
import { PermissionRequestsModule } from './permission-requests/permission-requests.module';
import { ChatbotModule } from './chatbot/chatbot.module';
import { SeedModule } from './roles/seed.module';
import { AuthModule } from './auth/auth.module';

import { Permission } from './permissions/entities/permission.entity';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Institution } from './institutions/entities/institution.entity';
import { Log } from './logs/entities/log.entity';
import { Session } from './auth/entities/session.entity';
import { PermissionRequest } from './permission-requests/entities/permission-request.entity';
import { System } from './systems/entities/system.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',

      url: process.env.DATABASE_URL,
      ssl:
        process.env.DATABASE_SSL === 'false'
          ? false
          : { rejectUnauthorized: false },
      entities: [
        Permission,
        Role,
        User,
        Institution,
        System,
        Log,
        Session,
        PermissionRequest,
      ],

      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    InstitutionsModule,
    SystemsModule,
    LogsModule,
    PermissionRequestsModule,
    ChatbotModule,
    SeedModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
