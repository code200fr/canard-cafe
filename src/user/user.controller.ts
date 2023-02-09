import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { UserRepositoryService } from './user-repository.service';
import { User } from './user.schema';

@Controller('user')
export class UserController {
  constructor(
    @Inject(UserRepositoryService) private userRepo: UserRepositoryService,
  ) {}

  @Get(':name/tokens')
  async user(@Param() params) {
    const user: User = await this.userRepo.byName(params.name);

    return user.getTopTokens();
  }
}
