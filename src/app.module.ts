import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { LogsModule } from './logs/logs.module';
import { PermissionRequestsModule } from './permission-requests/permission-requests.module';
import { PermissionGroupsModule } from './permission-groups/permission-groups.module';
import { ContractorsModule } from './contractors/contractors.module';
import { AuthModule } from './auth/auth.module';

import { Permission } from './permissions/entities/permission.entity';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Institution } from './institutions/entities/institution.entity';
import { Log } from './logs/entities/log.entity';
import { Session } from './auth/entities/session.entity';
import { PermissionRequest } from './permission-requests/entities/permission-request.entity';
import { PermissionGroup } from './permission-groups/entities/permission-group.entity';
import { Contractor } from './contractors/entities/contractor.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',

      url: process.env.DATABASE_URL,
      entities: [
        Permission,
        Role,
        User,
        Institution,
        Log,
        Session,
        PermissionRequest,
        PermissionGroup,
        Contractor,
      ],

      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    InstitutionsModule,
    LogsModule,
    PermissionRequestsModule,
    PermissionGroupsModule,
    ContractorsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
