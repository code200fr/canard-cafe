import { Injectable } from '@nestjs/common';
import { ProcessorInterface } from '../processor.interface';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';

@Injectable()
export class StatsProcessorService implements ProcessorInterface {
  name = 'stats';

  run(index: ParsedIndex, options?: ProcessorOptions): Promise<unknown> {
    const stats: Statistics = {
      topics: 0,
      users: 0,
      posts: 0,
      quotes: 0,
      smiley: 0,
    };

    stats.topics = index.topics.size;
    stats.users = index.users.size;

    index.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        stats.posts++;
        stats.smiley += post.smileys ? post.smileys.length : 0;
        stats.quotes += post.quotes ? post.quotes.length : 0;
      });
    });

    return Promise.resolve(stats);
  }
}

export interface Statistics {
  topics: number;
  users: number;
  posts: number;
  quotes: number;
  smiley: number;
}
