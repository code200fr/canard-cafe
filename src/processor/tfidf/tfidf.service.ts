import { Injectable } from '@nestjs/common';
import { TfidfDocument } from './tfidf-document';

// Inspired from https://github.com/kerryrodden/tiny-tfidf

@Injectable()
export class TfidfService {
  protected readonly K1 = 2.0;
  protected readonly b = 0.75;

  stopwords: string[] = [];

  protected computeCollectionFrequencies(
    documents: TfidfDocument[],
  ): FrequencyMap {
    const frequencies: FrequencyMap = new Map<string, number>();

    for (const document of documents) {
      document
        .getUniqueTokens()
        .filter((token) => !this.stopwords.includes(token))
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

  getTopTokens(
    vectors: VectorMap[],
    index: number,
    max = 30,
  ): [string, number][] {
    const vector: VectorMap = vectors[index];

    const tokens: [string, number][] = Array.from(vector.entries())
      .filter((d) => d[1] > 0)
      .sort((a, b) => b[1] - a[1]);

    return tokens.slice(0, max);
  }

  buildTopicDocument(topicPages: ParsedTopicPage[]): TfidfDocument {
    const index: string[] = [];

    for (const page of topicPages) {
      for (const post of page.posts) {
        const tokens = post.message
          .split(/[\s\.,!?\(\)\:'"\-\/]+/g)
          .map((token) => token.trim().toLocaleLowerCase('fr'))
          .filter((token) => token != '')
          .filter((token) => token.length > 2)
          .filter((token) => !token.match(/^\d/));

        index.push(...tokens);
      }
    }

    return new TfidfDocument(index);
  }
}

type FrequencyMap = Map<string, number>;
type WeightMap = Map<string, number>;
export type VectorMap = Map<string, number>;
