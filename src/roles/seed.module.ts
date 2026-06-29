import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Permission } from '../permissions/entities/permission.entity';
import { Role } from '../roles/entities/role.entity';
import { System } from '../systems/entities/system.entity';
import { ComplaintsSeedService } from '../seed/complaints-seed.service';
import { IamRolesSeedService } from '../seed/iam-roles-seed.service';

@Module({
  imports: [TypeOrmModule.forFeature([Permission, Role, System])],
  providers: [ComplaintsSeedService, IamRolesSeedService],
})
export class SeedModule {}
