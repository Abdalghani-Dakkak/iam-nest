import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { InstitutionsService } from './institutions.service';
import { Institution } from './entities/institution.entity';

describe('InstitutionsService', () => {
  let service: InstitutionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InstitutionsService,
        { provide: getRepositoryToken(Institution), useValue: {} },
      ],
    }).compile();

    service = module.get<InstitutionsService>(InstitutionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
