import { ProcessorInterface } from '../processor.interface';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';

export class UserTopicProcessorService implements ProcessorInterface {
  name = 'user-topic';

  run(index: ParsedIndex, options?: ProcessorOptions): Promise<unknown> {
    const all: AllUserTopics = new Map<number, UserTopics>();

    index.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        if (!all.has(post.author)) {
          all.set(post.author, {});
        }

        if (!all.get(post.author).hasOwnProperty(topic.id)) {
          all.get(post.author)[topic.id] = {
            id: topic.id,
            name: topic.title,
            count: 0,
          };
        }

        all.get(post.author)[topic.id].count++;
      });
    });

    return Promise.resolve(all);
  }
}

export type UserTopic = { id: number; name: string; count: number };
export type UserTopics = { [topicId: number]: UserTopic };
export type AllUserTopics = Map<number, UserTopics>;
export type FlatAllUserTopics = { [userId: number]: UserTopics };
