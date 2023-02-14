import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Tokens } from '../processor/tfidf/tfidf.service';
import {
  SmileyCount,
  UserSmileys,
} from '../processor/smiley/smiley-processor.service';
import { Quote, Quotes } from '../processor/quote/quote-processor.service';
import { UserTopic } from '../processor/user-topic/user-topic-processor.service';

export type UserDocument = HydratedDocument<User>;

@Schema()
export class UserSentiments {
  @Prop()
  negative: number;

  @Prop()
  neutral: number;

  @Prop()
  positive: number;
}

export const UserSentimentsSchema =
  SchemaFactory.createForClass(UserSentiments);

@Schema()
export class User {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true })
  name: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop({ type: String, required: false })
  title: string;

  @Prop({ type: String, required: false })
  avatar: string;

  @Prop()
  tokens: Tokens;

  @Prop()
  smileys: UserSmileys;

  @Prop()
  quotes: Quotes;

  @Prop()
  quotesBy: Quotes;

  @Prop()
  topics: UserTopic[];

  @Prop({ type: UserSentimentsSchema })
  sentiments: UserSentiments;

  @Prop()
  datetime: string; // serialized JSON

  getTopTokens: () => { token: string; freq: number }[];
  getTopSmileys: () => SmileyCount[];
  getTopTopics: () => UserTopic[];
  serialize: () => Partial<User>;
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.methods.getTopTokens = function (): string[] {
  return this.tokens
    .sort(
      (
        a: { token: string; freq: number },
        b: { token: string; freq: number },
      ) => {
        return a.freq > b.freq ? -1 : 1;
      },
    )
    .map((token) => {
      token.freq = Math.round(token.freq * 10000) / 10000;

      return token;
    });
};

UserSchema.methods.getTopSmileys = function (): SmileyCount[] {
  const total = (this.smileys as UserSmileys).reduce(
    (acc: number, current: SmileyCount) => {
      return acc + current.count;
    },
    0,
  );

  return this.smileys
    .sort((a: SmileyCount, b: SmileyCount) => {
      return a.count > b.count ? -1 : 1;
    })
    .map((smiley: SmileyCount) => {
      smiley.percent = Math.round((smiley.count / total) * 10000) / 100;
      return smiley;
    });
};

UserSchema.methods.getTopQuotes = function (): Quotes {
  return this.quotes.sort((a: Quote, b: Quote) => {
    return a.count > b.count ? -1 : 1;
  });
};

UserSchema.methods.getTopQuotesBy = function (): Quotes {
  return this.quotesBy.sort((a: Quote, b: Quote) => {
    return a.count > b.count ? -1 : 1;
  });
};

UserSchema.methods.getTopTopics = function (): UserTopic[] {
  return this.topics.sort((a: UserTopic, b: UserTopic) => {
    return a.count > b.count ? -1 : 1;
  });
};

UserSchema.methods.serialize = function (): Partial<User> {
  return {
    id: this.id,
    name: this.name,
    url: this.url,
    title: this.title,
    avatar: this.avatar,
    tokens: this.getTopTokens(),
    smileys: this.getTopSmileys(),
    quotes: this.getTopQuotes().slice(0, 10),
    quotesBy: this.getTopQuotesBy().slice(0, 10),
    topics: this.getTopTopics().slice(0, 8),
    sentiments: this.sentiments,
    datetime: JSON.parse(this.datetime || 'null'),
  };
};
