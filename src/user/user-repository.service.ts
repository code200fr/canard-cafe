import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';
import { ParsedUser } from '../content-parser/parsed-index';
import { Tokens } from '../processor/tfidf/tfidf.service';

@Injectable()
export class UserRepositoryService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  async truncate() {
    return this.userModel.deleteMany();
  }

  async byName(name: string): Promise<User> {
    return this.userModel.findOne({
      name: name,
    });
  }

  async create(user: ParsedUser, tokens: Tokens): Promise<User> {
    const created = new this.userModel({
      id: user.id,
      name: user.name,
      title: user.title,
      url: user.url,
      tokens: tokens,
    });

    return created.save();
  }
}
