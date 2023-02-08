import { Test, TestingModule } from '@nestjs/testing';
import { TopicRepositoryService } from './topic-repository.service';

describe('TopicRepositoryService', () => {
  let service: TopicRepositoryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TopicRepositoryService],
    }).compile();

    service = module.get<TopicRepositoryService>(TopicRepositoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
