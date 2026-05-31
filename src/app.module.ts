import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';

import { UsersModule } from './users/users.module';
import { RolesModule } from './roles/roles.module';
import { PermissionsModule } from './permissions/permissions.module';
import { InstitutionsModule } from './institutions/institutions.module';
import { AuthModule } from './auth/auth.module';

import { Permission } from './permissions/entities/permission.entity';
import { Role } from './roles/entities/role.entity';
import { User } from './users/entities/user.entity';
import { Institution } from './institutions/entities/institution.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 3306,
      username: 'root',
      password: '',
      database: 'iam',
      entities: [Permission, Role, User, Institution],
      synchronize: true,
    }),
    AuthModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    InstitutionsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
