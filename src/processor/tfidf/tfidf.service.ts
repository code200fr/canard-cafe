import { Injectable, Logger } from '@nestjs/common';
import { TfidfDocument } from './tfidf-document';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
  ParsedUser,
} from '../../content-parser/parsed-index';
import StopWords from '../../etc/stopwords.json';
import { ProcessorInterface } from '../processor.interface';
import { ProcessorOptions } from '../processor-factory.service';

// Inspired by https://github.com/kerryrodden/tiny-tfidf

@Injectable()
export class TfidfService implements ProcessorInterface {
  name = 'tfidf';

  protected readonly K1 = 2.0;
  protected readonly b = 0.75;
  protected logger: Logger = new Logger(TfidfService.name);

  stopWords: string[] = StopWords;

  protected computeCollectionFrequencies(
    documents: TfidfDocument[],
  ): FrequencyMap {
    const frequencies: FrequencyMap = new Map<string, number>();

    for (const document of documents) {
      document
        .getUniqueTokens()
        .filter((token) => !this.stopWords.includes(token))
        .forEach((token) => {
          if (frequencies.has(token)) {
            return frequencies.set(token, frequencies.get(token) + 1);
          }

          return frequencies.set(token, 1);
        });
    }

    return frequencies;
  }

  protected computeCollectionFrequencyWeights(
    documents: TfidfDocument[],
    frequencies: FrequencyMap,
  ): WeightMap {
    const weights: Map<string, number> = new Map<string, number>();
    const N = documents.length;

    for (const [token, n] of frequencies.entries()) {
      weights.set(token, Math.log(N + 1) - Math.log(n));
    }

    return weights;
  }

  computeVectors(documents: TfidfDocument[]): VectorMap[] {
    const frequencies: FrequencyMap =
      this.computeCollectionFrequencies(documents);

    const weights: WeightMap = this.computeCollectionFrequencyWeights(
      documents,
      frequencies,
    );

    const vectors: VectorMap[] = [];

    const totalLength: number = documents
      .map((doc: TfidfDocument) => doc.length)
      .reduce((a: number, b: number) => a + b, 0);
    const avgLength = totalLength / documents.length;

    for (const document of documents) {
      const vector: VectorMap = new Map<string, number>();
      const ndl = totalLength / avgLength;

      for (const [token, idf] of weights.entries()) {
        const tf: number = document.getFrequency(token);
        const cw: number = tf
          ? (idf * tf * (this.K1 + 1)) /
            (this.K1 * (1 - this.b + this.b * ndl) + tf)
          : 0.0;

        vector.set(token, cw);
      }

      vectors.push(vector);
    }

    return vectors;
  }

  getTopTokens(vectors: VectorMap[], index: number, max = 30): Tokens {
    const vector: VectorMap = vectors[index];

    const tokens: Tokens = Array.from(vector.entries())
      .filter((d) => d[1] > 0)
      .sort((a, b) => b[1] - a[1])
      .map((token: [string, number]) => {
        return {
          token: token[0],
          freq: token[1],
        };
      });

    return tokens.slice(0, max);
  }

  buildTopicDocument(topic: ParsedTopic, keepRatio: number): TfidfDocument {
    let all = '';

    topic.posts.forEach((post: ParsedPost) => {
      all += post.message + ' ';
    });

    const tokens: string[] = this.pickRandomElements(
      this.parseMessage(all),
      keepRatio,
    );

    return new TfidfDocument(tokens, topic.id);
  }

  buildUserDocument(user: ParsedUser, keepRatio: number): TfidfDocument {
    const all: string = user.messages.join(' ');

    const tokens: string[] = this.pickRandomElements(
      this.parseMessage(all),
      keepRatio,
    );

    return new TfidfDocument(tokens, user.id);
  }

  protected pickRandomElements(arr, ratio) {
    let n: number = Math.round(arr.length * ratio);
    const result = new Array(n);
    let len = arr.length;
    const taken = new Array(len);

    if (n > len) {
      throw new RangeError('getRandom: more elements taken than available');
    }

    while (n--) {
      const x = Math.floor(Math.random() * len);
      result[n] = arr[x in taken ? taken[x] : x];
      taken[x] = --len in taken ? taken[len] : len;
    }
    return result;
  }

  protected parseMessage(message: string): string[] {
    return message
      .split(/[\s\.,!?\(\)\:'"\-\/]+/g)
      .map((token) => token.trim().toLocaleLowerCase('fr'))
      .filter((token) => token != '')
      .filter((token) => token.length > 2)
      .filter((token) => !token.match(/^\d/));
  }

  async run(
    index: ParsedIndex,
    options?: ProcessorOptions,
  ): Promise<AllTokens> {
    const topicDocuments: TfidfDocument[] = [];
    const userDocuments: TfidfDocument[] = [];

    const minMessages = Number(options?.minMessages ?? 200);
    const maxTokens = Number(options?.maxTokens ?? 100);
    const keepRatio = Number(options?.keepRatio ?? 0.1);

    this.logger.log('Building topic documents...');
    index.topics.forEach((topic: ParsedTopic) => {
      if (topic.posts.length < minMessages) {
        return;
      }

      topicDocuments.push(this.buildTopicDocument(topic, keepRatio));
    });
    this.logger.log(`Built ${topicDocuments.length} topic documents`);

    this.logger.log('Building user documents...');
    index.aggregateUserPosts();

    index.users.forEach((user: ParsedUser) => {
      if (!user.messages || user.messages.length < minMessages) {
        return;
      }

      userDocuments.push(this.buildUserDocument(user, keepRatio));
    });
    this.logger.log(`Built ${userDocuments.length} user documents`);

    this.logger.log('Computing topic vectors...');
    const topicVectors: VectorMap[] = this.computeVectors(topicDocuments);

    this.logger.log('Computing user vectors...');
    const userVectors: VectorMap[] = this.computeVectors(userDocuments);

    const topicTokens: Map<number, Tokens> = new Map<number, Tokens>();
    const userTokens: Map<number, Tokens> = new Map<number, Tokens>();

    this.logger.log('Extracting topic tokens...');
    topicDocuments.forEach((document: TfidfDocument, idx: number) => {
      topicTokens.set(
        document.id,
        this.getTopTokens(topicVectors, idx, maxTokens),
      );
    });

    this.logger.log('Extracting user tokens...');
    userDocuments.forEach((document: TfidfDocument, idx: number) => {
      userTokens.set(
        document.id,
        this.getTopTokens(userVectors, idx, maxTokens),
      );
    });

    return {
      topics: topicTokens,
      users: userTokens,
    };
  }
}

type FrequencyMap = Map<string, number>;
type WeightMap = Map<string, number>;
export type VectorMap = Map<string, number>;
export type TokensMap = {
  [id: number]: Tokens;
};
export type Tokens = Array<{
  token: string;
  freq: number;
}>;
export type AllTokens = {
  topics: Map<number, Tokens>;
  users: Map<number, Tokens>;
};
