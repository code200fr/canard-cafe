import { Controller, Get, Inject, Query } from '@nestjs/common';
import { TopicRepositoryService } from './topic/topic-repository/topic-repository.service';

@Controller()
export class AppController {
  constructor(
    @Inject(TopicRepositoryService) private topicRepo: TopicRepositoryService,
  ) {}

  @Get()
  async home(@Query('q') token: string) {
    return this.topicRepo.search(token);
  }
}
