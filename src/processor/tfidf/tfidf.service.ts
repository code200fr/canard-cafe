import { Injectable, Logger } from '@nestjs/common';
import { TfidfDocument } from './tfidf-document';
import {
  ParsedIndex,
  ParsedPost,
  ParsedTopic,
  ParsedUser,
} from '../../content-parser/parsed-index';
import StopWords from '../../etc/stopwords.json';

// Inspired by https://github.com/kerryrodden/tiny-tfidf

@Injectable()
export class TfidfService {
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

  buildTopicDocument(topic: ParsedTopic): TfidfDocument {
    let all = '';

    topic.posts.forEach((post: ParsedPost) => {
      all += post.message + ' ';
    });

    return new TfidfDocument(this.parseMessage(all), topic.id);
  }

  buildUserDocument(user: ParsedUser): TfidfDocument {
    const all: string = user.messages.join(' ');

    return new TfidfDocument(this.parseMessage(all), user.id);
  }

  protected parseMessage(message: string): string[] {
    return message
      .split(/[\s\.,!?\(\)\:'"\-\/]+/g)
      .map((token) => token.trim().toLocaleLowerCase('fr'))
      .filter((token) => token != '')
      .filter((token) => token.length > 2)
      .filter((token) => !token.match(/^\d/));
  }

  allFromIndex(
    index: ParsedIndex,
    minMessages = 200,
    maxTokens = 100,
  ): AllTokens {
    const topicDocuments: TfidfDocument[] = [];
    const userDocuments: TfidfDocument[] = [];

    this.logger.log('Building topic documents...');
    index.topics.forEach((topic: ParsedTopic) => {
      if (topic.posts.length < minMessages) {
        return;
      }

      topicDocuments.push(this.buildTopicDocument(topic));
    });
    this.logger.log(`Built ${topicDocuments.length} topic documents`);

    this.logger.log('Building user documents...');
    index.aggregateUserPosts();

    index.users.forEach((user: ParsedUser) => {
      if (!user.messages || user.messages.length < minMessages) {
        return;
      }

      userDocuments.push(this.buildUserDocument(user));
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
export type Tokens = Array<{
  token: string;
  freq: number;
}>;
export type AllTokens = {
  topics: Map<number, Tokens>;
  users: Map<number, Tokens>;
};
