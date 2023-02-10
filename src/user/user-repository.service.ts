import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import {
  ParsedIndex,
  ParsedTopic,
  ParsedUser,
} from '../content-parser/parsed-index';
import { Tokens, TokensMap } from '../processor/tfidf/tfidf.service';
import { ProcessorsData } from '../processor/processor-factory.service';
import { Topic } from '../topic/topic.schema';
import {
  SmileyMap,
  SmileyUsage,
  UserSmileys,
} from '../processor/smiley/smiley-processor.service';

@Injectable()
export class UserRepositoryService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async importAll(
    index: ParsedIndex,
    processors: ProcessorsData,
  ): Promise<User[]> {
    await this.truncate();

    const tfidf = processors.get('tfidf') as Record<
      'topics' | 'users',
      TokensMap
    >;
    const usersTokens = tfidf.users;

    const smiley = processors.get('smiley') as Record<'users', SmileyMap>;
    const usersSmiley = smiley.users;

    const promises: Promise<User>[] = [];

    const smileyToArray = (smiley: SmileyUsage): UserSmileys => {
      const arr: UserSmileys = [];

      for (const sm in smiley) {
        arr.push({
          smiley: sm,
          count: smiley[sm],
        });
      }

      return arr;
    };

    index.users.forEach((user: ParsedUser) => {
      promises.push(
        this.create(
          user,
          usersTokens[user.id],
          smileyToArray(usersSmiley[user.id]),
        ),
      );
    });

    return Promise.all(promises);
  }

  async truncate() {
    return this.userModel.deleteMany();
  }

  async search(name: string): Promise<User[]> {
    return this.userModel
      .find({
        name: { $regex: '^' + name, $options: 'i' },
      })
      .limit(12);
  }

  async byName(name: string): Promise<User> {
    return this.userModel.findOne({
      name: name,
    });
  }

  async create(
    user: ParsedUser,
    tokens: Tokens,
    smileys: UserSmileys,
  ): Promise<User> {
    const created = new this.userModel({
      id: user.id,
      name: user.name,
      title: user.title,
      url: user.url,
      tokens: tokens,
      smileys: smileys,
    });

    return created.save();
  }
}
