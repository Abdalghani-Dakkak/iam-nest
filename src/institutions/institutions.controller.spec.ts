import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstitutionsController } from './institutions.controller';
import { InstitutionsService } from './institutions.service';
import { Institution } from './entities/institution.entity';

describe('InstitutionsController', () => {
  let controller: InstitutionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [InstitutionsController],
      providers: [
        InstitutionsService,
        { provide: getRepositoryToken(Institution), useValue: {} },
      ],
    }).compile();

    controller = module.get<InstitutionsController>(InstitutionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
