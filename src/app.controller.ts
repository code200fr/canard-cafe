import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { TopicRepositoryService } from './topic/topic-repository.service';
import { UserRepositoryService } from './user/user-repository.service';
import { User } from './user/user.schema';

@Controller()
export class AppController {
  constructor(
    @Inject(TopicRepositoryService) private topicRepo: TopicRepositoryService,
    @Inject(UserRepositoryService) private userRepo: UserRepositoryService,
  ) {}
}
