import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Topic, TopicDocument } from './topic.schema';
import { Expression, Model } from 'mongoose';
import { AllTokens, Tokens, TokensMap } from '../processor/tfidf/tfidf.service';
import { ParsedIndex, ParsedTopic } from '../content-parser/parsed-index';
import { ProcessorsData } from '../processor/processor-factory.service';
import { Statistics } from '../processor/stats/stats-processor.service';
import fs from 'fs';
import path from 'path';
import * as process from 'process';

@Injectable()
export class TopicRepositoryService {
  protected stats: Statistics;

  constructor(
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
  ) {}

  getStatistics(): Statistics {
    if (this.stats !== undefined) {
      return this.stats;
    }

    const file: string = path.join(
      process.cwd(),
      'var',
      'processed',
      'stats.json',
    );

    if (!fs.existsSync(file)) {
      this.stats = null;
      return this.stats;
    }

    const data: string = fs.readFileSync(file, 'utf8');
    this.stats = JSON.parse(data) as Statistics;

    return this.stats;
  }

  async importAll(
    index: ParsedIndex,
    processors: ProcessorsData,
  ): Promise<Topic[]> {
    await this.truncate();

    const tfidf = processors.get('tfidf') as Record<
      'topics' | 'users',
      TokensMap
    >;
    const topicsTokens = tfidf.topics;
    const promises: Promise<Topic>[] = [];

    index.topics.forEach((topic: ParsedTopic) => {
      promises.push(this.create(topic, topicsTokens[topic.id]));
    });

    return Promise.all(promises);
  }

  async truncate() {
    return this.topicModel.deleteMany();
  }

  async allTitle(): Promise<Partial<Topic>[]> {
    return this.topicModel.find({}).then((topics: Topic[]) => {
      return topics.map((topic: Topic) => {
        return {
          id: topic.id,
          title: topic.title,
        };
      });
    });
  }

  async search(token: string): Promise<Topic[]> {
    return this.topicModel.find({
      tokens: {
        $elemMatch: {
          token: token,
        },
      },
    });
  }

  async create(topic: ParsedTopic, tokens: Tokens): Promise<Topic> {
    const created = new this.topicModel({
      id: topic.id,
      title: topic.title,
      url: topic.url,
      tokens: tokens,
    });

    return created.save();
  }
}
