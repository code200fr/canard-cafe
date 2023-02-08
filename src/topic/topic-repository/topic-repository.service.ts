import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Topic, TopicDocument } from '../../schemas/topic.schema';
import { Model } from 'mongoose';
import { TopicTokens } from '../../processor/tfidf/tfidf.service';

@Injectable()
export class TopicRepositoryService {
  constructor(
    @InjectModel(Topic.name) private topicModel: Model<TopicDocument>,
  ) {}

  async truncate() {
    return this.topicModel.deleteMany();
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

  async create(topic: ParsedTopic, tokens: TopicTokens): Promise<Topic> {
    const created = new this.topicModel({
      id: topic.id,
      title: topic.title,
      url: topic.url,
      tokens: tokens,
    });

    return created.save();
  }
}
