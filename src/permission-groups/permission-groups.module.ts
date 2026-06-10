import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PermissionGroupsService } from './permission-groups.service';
import { PermissionGroupsController } from './permission-groups.controller';
import { PermissionGroup } from './entities/permission-group.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { Permission } from '../permissions/entities/permission.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionGroup, Institution, Permission]),
  ],
  controllers: [PermissionGroupsController],
  providers: [PermissionGroupsService],
  exports: [PermissionGroupsService],
})
export class PermissionGroupsModule {}
