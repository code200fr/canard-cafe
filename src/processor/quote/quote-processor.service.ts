import { ProcessorInterface } from '../processor.interface';
import { Injectable, Logger } from '@nestjs/common';
import {
  ParsedIndex,
  ParsedPost,
  ParsedQuote,
  ParsedTopic,
  UserNameIndex,
} from '../../content-parser/parsed-index';
import { ProcessorOptions } from '../processor-factory.service';

@Injectable()
export class QuoteProcessorService implements ProcessorInterface {
  name = 'quote';
  private logger: Logger = new Logger(QuoteProcessorService.name);

  run(
    index: ParsedIndex,
    options?: ProcessorOptions,
  ): Promise<ProcessedQuotes> {
    const quotes: Map<number, UserQuotes> = new Map<number, UserQuotes>();
    const quotesBy: Map<number, UserQuotes> = new Map<number, UserQuotes>();
    const usernameIndex: UserNameIndex = index.getUserNameIndex();

    index.topics.forEach((topic: ParsedTopic) => {
      topic.posts.forEach((post: ParsedPost) => {
        post.quotes.forEach((quote: ParsedQuote) => {
          if (!quotes.has(post.author)) {
            quotes.set(post.author, {});
          }

          if (!quote.authorName) {
            return;
          }

          if (!quotes.get(post.author).hasOwnProperty(quote.authorName)) {
            quotes.get(post.author)[quote.authorName] = 0;
          }

          quotes.get(post.author)[quote.authorName]++;

          let byId: number;

          if (usernameIndex.hasOwnProperty(quote.authorName)) {
            byId = usernameIndex[quote.authorName];
          }

          if (!quotesBy.has(byId)) {
            quotesBy.set(byId, {});
          }

          const byName: string = index.users.get(post.author)?.name;

          if (!byName) {
            return;
          }

          if (!quotesBy.get(byId).hasOwnProperty(byName)) {
            quotesBy.get(byId)[byName] = 0;
          }

          quotesBy.get(byId)[byName]++;
        });
      });
    });

    return Promise.resolve({
      from: quotes,
      by: quotesBy,
    });
  }
}

export type UserQuotes = { [name: string]: number };
export type Quote = {
  username: string;
  count: number;
};
export type Quotes = Array<Quote>;
export type QuoteMap = Map<number, UserQuotes>;
export type ProcessedQuotes = Record<'from' | 'by', QuoteMap>;
