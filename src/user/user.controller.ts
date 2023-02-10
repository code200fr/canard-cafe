import { Controller, Get, Inject, Param, Query } from '@nestjs/common';
import { UserRepositoryService } from './user-repository.service';
import { User } from './user.schema';

@Controller('user')
export class UserController {
  constructor(
    @Inject(UserRepositoryService) private userRepo: UserRepositoryService,
  ) {}

  @Get('search')
  async search(@Query('q') q) {
    if (!q) {
      return [];
    }

    q = q.toString().trim();

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
    q = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    if (!q) {
      return [];
    }

    return this.userRepo.search(q).then((users: User[]) => {
      return users.map((user: User) => user.name);
    });
  }

  @Get(':name/smileys')
  async smileys(@Param() params) {
    const user: User = await this.userRepo.byName(params.name);

    return user.getTopSmileys();
  }

  @Get(':name/tokens')
  async tokens(@Param() params) {
    const user: User = await this.userRepo.byName(params.name);

    return user.getTopTokens();
  }
}
