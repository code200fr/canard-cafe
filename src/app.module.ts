import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppService } from './app.service';
import { ScrapperService } from './scrapper/scrapper.service';
import { ContentParserService } from './content-parser/content-parser.service';
import { TfidfService } from './processor/tfidf/tfidf.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Topic, TopicSchema } from './topic/topic.schema';
import { TopicRepositoryService } from './topic/topic-repository.service';
import { UserRepositoryService } from './user/user-repository.service';
import { User, UserSchema } from './user/user.schema';
import { UserController } from './user/user.controller';
import { ProcessorFactoryService } from './processor/processor-factory.service';
import { SmileyProcessorService } from './processor/smiley/smiley-processor.service';
import { QuoteProcessorService } from './processor/quote/quote-processor.service';
import { UserTopicProcessorService } from './processor/user-topic/user-topic-processor.service';
import { SentimentProcessorService } from './processor/sentiment/sentiment-processor.service';
import { DatetimeProcessorService } from './processor/datetime/datetime-processor.service';
import { TopicController } from './topic/topic.controller';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot('mongodb://cpc_mongo/coin'),
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [UserController, TopicController],
  providers: [
    AppService,
    ScrapperService,
    ContentParserService,
    ProcessorFactoryService,
    TfidfService,
    SmileyProcessorService,
    QuoteProcessorService,
    UserTopicProcessorService,
    SentimentProcessorService,
    DatetimeProcessorService,
    TopicRepositoryService,
    UserRepositoryService,
  ],
})
export class AppModule {}
