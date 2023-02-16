import { Controller, Get, Inject, Param } from '@nestjs/common';
import { TopicRepositoryService } from './topic-repository.service';
import { User } from '../user/user.schema';

@Controller('topic')
export class TopicController {
  constructor(
    @Inject(TopicRepositoryService) private topicRepo: TopicRepositoryService,
  ) {}

  @Get('list')
  async get() {
    return this.topicRepo.allTitle();
  }
}
