import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SystemsService } from './systems.service';
import { SystemsController } from './systems.controller';
import { System } from './entities/system.entity';
import { Institution } from '../institutions/entities/institution.entity';

@Module({
  imports: [TypeOrmModule.forFeature([System, Institution])],
  controllers: [SystemsController],
  providers: [SystemsService],
  exports: [SystemsService],
})
export class SystemsModule {}
