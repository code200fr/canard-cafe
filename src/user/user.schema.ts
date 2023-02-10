import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Tokens } from '../processor/tfidf/tfidf.service';
import {
  SmileyCount,
  SmileyUsage,
  UserSmileys,
} from '../processor/smiley/smiley-processor.service';

export type UserDocument = HydratedDocument<User>;

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

  getTopTokens: () => string[];
  getTopSmileys: () => string[];
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
    .map((token) => token.token);
};

UserSchema.methods.getTopSmileys = function (): SmileyCount[] {
  return this.smileys.sort((a: SmileyCount, b: SmileyCount) => {
    return a.count > b.count ? -1 : 1;
  });
};
