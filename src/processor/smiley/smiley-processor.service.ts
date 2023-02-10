import { Injectable } from '@nestjs/common';
import { ProcessorInterface } from '../processor.interface';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';
import { Tokens } from '../tfidf/tfidf.service';

@Injectable()
export class SmileyProcessorService implements ProcessorInterface {
  name = 'smiley';

  async run(
    index: ParsedIndex,
    options?: ProcessorOptions,
  ): Promise<AllSmileys> {
    const userSmiley = new Map<number, SmileyUsage>();
    const topicSmiley = new Map<number, SmileyUsage>();

    index.topics.forEach((topic: ParsedTopic) => {
      if (!topicSmiley.has(topic.id)) {
        topicSmiley.set(topic.id, {});
      }

      topic.posts.forEach((post: ParsedPost) => {
        if (!userSmiley.has(post.author)) {
          userSmiley.set(post.author, {});
        }

        post.smileys.forEach((smiley: string) => {
          if (!topicSmiley.get(topic.id).hasOwnProperty(smiley)) {
            topicSmiley.get(topic.id)[smiley] = 0;
          }

          if (!userSmiley.get(post.author).hasOwnProperty(smiley)) {
            userSmiley.get(post.author)[smiley] = 0;
          }

          topicSmiley.get(topic.id)[smiley]++;
          userSmiley.get(post.author)[smiley]++;
        });
      });
    });

    return {
      topics: topicSmiley,
      users: userSmiley,
    };
  }
}

export type SmileyMap = {
  [id: number]: SmileyUsage;
};

export type SmileyUsage = {
  [smiley: string]: number;
};

export type SmileyCount = {
  smiley: string;
  count: number;
};

export type UserSmileys = Array<SmileyCount>;

export type AllSmileys = {
  topics: Map<number, SmileyUsage>;
  users: Map<number, SmileyUsage>;
};
