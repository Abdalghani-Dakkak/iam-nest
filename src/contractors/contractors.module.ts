import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContractorsService } from './contractors.service';
import { ContractorsController } from './contractors.controller';
import { Contractor } from './entities/contractor.entity';
import { Institution } from '../institutions/entities/institution.entity';
import { PermissionGroup } from '../permission-groups/entities/permission-group.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Contractor, Institution, PermissionGroup]),
  ],
  controllers: [ContractorsController],
  providers: [ContractorsService],
  exports: [ContractorsService],
})
export class ContractorsModule {}
