import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Tokens } from '../processor/tfidf/tfidf.service';

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

  getTopTokens: Function;
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
