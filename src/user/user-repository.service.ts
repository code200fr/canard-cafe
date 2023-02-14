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
import { Quotes, UserQuotes } from '../processor/quote/quote-processor.service';
import {
  AllUserTopics,
  FlatAllUserTopics,
  UserTopic,
  UserTopics,
} from '../processor/user-topic/user-topic-processor.service';
import {
  FlatUserSentiments,
  UserSentiment,
} from '../processor/sentiment/sentiment-processor.service';
import {
  FlatUserWeek,
  Week,
} from '../processor/datetime/datetime-processor.service';

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
    const quotes = processors.get('quote') as Record<
      'from' | 'by',
      { [uid: number]: UserQuotes }
    >;
    const userTopics: FlatAllUserTopics = processors.get(
      'user-topic',
    ) as FlatAllUserTopics;

    const userSentiments: FlatUserSentiments = processors.get(
      'sentiment',
    ) as FlatUserSentiments;

    const userDateTime: FlatUserWeek = processors.get(
      'datetime',
    ) as FlatUserWeek;

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

    const quotesToArray = (quotes: UserQuotes): Quotes => {
      const arr: Quotes = [];
      for (const username in quotes) {
        arr.push({
          username: username,
          count: quotes[username],
        });
      }

      return arr;
    };

    const userTopicToArray = (userTopics: UserTopics): UserTopic[] => {
      const arr: UserTopic[] = [];

      for (const topicId in userTopics) {
        arr.push(userTopics[topicId]);
      }

      return arr;
    };

    index.users.forEach((user: ParsedUser) => {
      const userQuotes: UserQuotes = quotes.from[user.id];
      const byQuotes: UserQuotes = quotes.by[user.id];

      promises.push(
        this.create(
          user,
          usersTokens[user.id],
          smileyToArray(usersSmiley[user.id]),
          quotesToArray(userQuotes),
          quotesToArray(byQuotes),
          userTopicToArray(userTopics[user.id]),
          userSentiments[user.id],
          userDateTime[user.id],
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
    quotes: Quotes,
    quotesBy: Quotes,
    userTopics: UserTopic[],
    sentiments: UserSentiment,
    datetime: Week,
  ): Promise<User> {
    const created = new this.userModel({
      id: user.id,
      name: user.name,
      title: user.title,
      avatar: user.avatar,
      url: user.url,
      tokens: tokens,
      smileys: smileys,
      quotes: quotes,
      quotesBy: quotesBy,
      topics: userTopics,
      sentiments: sentiments,
      datetime: JSON.stringify(datetime),
    });

    return created.save();
  }
}
