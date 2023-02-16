import {
  Controller,
  Get,
  Inject,
  Param,
  Query,
  Res,
  StreamableFile,
} from '@nestjs/common';
import { UserRepositoryService } from './user-repository.service';
import { User } from './user.schema';
import type { Response } from 'express';
import fs from 'fs';
import path from 'path';

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

    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
    q = q
      .toString()
      .trim()
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

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

  @Get('graph')
  async graph(@Res({ passthrough: true }) res: Response) {
    const file = fs.createReadStream(
      path.join(process.cwd(), 'var', 'community.gexf'),
    );

    res.set({
      'Content-Type': 'gephi/gexf',
      'Content-Disposition': 'attachment; filename="community.gexf"',
    });

    return new StreamableFile(file);
  }

  @Get(':name')
  async get(@Param() params) {
    return this.userRepo
      .byName(params.name)
      .then((user: User) => user.serialize());
  }
}
