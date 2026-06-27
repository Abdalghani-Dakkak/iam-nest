import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { ComplaintsSeedService } from './complaints-seed.service';
import { IamRolesSeedService } from './iam-roles-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role])],
  providers: [ComplaintsSeedService, IamRolesSeedService],
})
export class SeedModule {}
