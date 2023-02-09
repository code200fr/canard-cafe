import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { Tokens } from '../processor/tfidf/tfidf.service';

export type TopicDocument = HydratedDocument<Topic>;

@Schema()
export class Topic {
  @Prop({ type: Number, required: true })
  id: number;

  @Prop({ type: String, required: true })
  title: string;

  @Prop({ type: String, required: true })
  url: string;

  @Prop()
  tokens: Tokens;
}

export const TopicSchema = SchemaFactory.createForClass(Topic);
