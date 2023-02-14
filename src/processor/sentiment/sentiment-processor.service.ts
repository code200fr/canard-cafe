import { Injectable, Logger } from '@nestjs/common';
import { ProcessorInterface } from '../processor.interface';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';
import {
  SentimentAnalyzer,
  AggressiveTokenizerFr,
  PorterStemmerFr,
} from 'natural';

@Injectable()
export class SentimentProcessorService implements ProcessorInterface {
  name = 'sentiment';

  run(index: ParsedIndex, options?: ProcessorOptions): Promise<unknown> {
    const messages: Map<number, string[]> = new Map<number, string[]>();

    index.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        if (!messages.has(post.author)) {
          messages.set(post.author, []);
        }

        let sentences: string[] = post.message.match(/[^\.!\?\n]+[\.!\?\n]+/g);

        if (!sentences) {
          return;
        }

        sentences = sentences
          .map((sentence) => sentence.trim())
          .filter((sentence) => sentence !== '');

        messages.get(post.author).push(...sentences);
      });
    });

    const tokeniser = new AggressiveTokenizerFr();
    const analyser = new SentimentAnalyzer(
      'French',
      PorterStemmerFr,
      'pattern',
    );

    const sentiments: AllUserSentiment = new Map<number, UserSentiment>();

    messages.forEach((userMessages: string[], userId: number) => {
      const picked = userMessages
        .map((value) => ({ value, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map(({ value }) => value)
        .slice(0, 1000);

      if (picked.length < 200) {
        return;
      }

      picked.forEach((msg: string) => {
        const tokens: string[] = tokeniser.tokenize(msg);

        if (!tokens.length) {
          return;
        }

        const sentiment: number = analyser.getSentiment(tokens);

        if (!sentiments.has(userId)) {
          sentiments.set(userId, {
            negative: 0,
            neutral: 0,
            positive: 0,
          });
        }

        if (sentiment === 0) {
          sentiments.get(userId).neutral++;
        } else if (sentiment < 0) {
          sentiments.get(userId).negative++;
        } else {
          sentiments.get(userId).positive++;
        }
      });
    });

    return Promise.resolve(sentiments);
  }
}

export type AllUserSentiment = Map<number, UserSentiment>;
export type FlatUserSentiments = {
  [userId: number]: UserSentiment;
};

export type UserSentiment = {
  negative: number;
  neutral: number;
  positive: number;
};
