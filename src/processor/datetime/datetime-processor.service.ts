import { Injectable, Logger } from '@nestjs/common';
import { ProcessorInterface } from '../processor.interface';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';
import * as process from 'process';
import moment, { Moment } from 'moment-timezone';

@Injectable()
export class DatetimeProcessorService implements ProcessorInterface {
  name = 'datetime';

  run(index: ParsedIndex, options?: ProcessorOptions): Promise<unknown> {
    const userWeek: UserWeek = new Map<number, Week>();

    index.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        if (!post.date) {
          return;
        }

        const date: Moment = moment(post.date).tz('Europe/Paris');
        const dayOfWeek: number = date.isoWeekday();
        const hourRange: number = Math.floor(date.hour() / 2) * 2;

        if (!userWeek.has(post.author)) {
          userWeek.set(post.author, JSON.parse(JSON.stringify(DefaultWeek)));
        }

        try {
          userWeek.get(post.author)[dayOfWeek][hourRange]++;
        } catch (e) {
          console.error(post, date, dayOfWeek, hourRange);
          throw e;
        }
      });
    });

    return Promise.resolve(userWeek);
  }
}

export type FlatUserWeek = {
  [userId: number]: Week;
};
export type UserWeek = Map<number, Week>;

export type Week = {
  1: DayTime;
  2: DayTime;
  3: DayTime;
  4: DayTime;
  5: DayTime;
  6: DayTime;
  7: DayTime;
};

export type DayTime = {
  0: number;
  2: number;
  4: number;
  6: number;
  8: number;
  10: number;
  12: number;
  14: number;
  16: number;
  18: number;
  20: number;
  22: number;
};

export const DefaultDayTime: DayTime = {
  0: 0,
  2: 0,
  4: 0,
  6: 0,
  8: 0,
  10: 0,
  12: 0,
  14: 0,
  16: 0,
  18: 0,
  20: 0,
  22: 0,
};

export const DefaultWeek: Week = {
  1: DefaultDayTime,
  2: DefaultDayTime,
  3: DefaultDayTime,
  4: DefaultDayTime,
  5: DefaultDayTime,
  6: DefaultDayTime,
  7: DefaultDayTime,
};
