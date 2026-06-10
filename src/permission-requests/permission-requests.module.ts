import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionRequestsService } from './permission-requests.service';
import { PermissionRequestsController } from './permission-requests.controller';
import { PermissionRequest } from './entities/permission-request.entity';
import { Permission } from '../permissions/entities/permission.entity';
import { User } from '../users/entities/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PermissionRequest, Permission, User])],
  controllers: [PermissionRequestsController],
  providers: [PermissionRequestsService],
  exports: [PermissionRequestsService],
})
export class PermissionRequestsModule {}
