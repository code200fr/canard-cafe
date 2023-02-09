import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapperService } from './scrapper/scrapper.service';
import { ContentParserService } from './content-parser/content-parser.service';
import { TfidfService } from './processor/tfidf/tfidf.service';
import { MongooseModule } from '@nestjs/mongoose';
import { Topic, TopicSchema } from './topic/topic.schema';
import { TopicRepositoryService } from './topic/topic-repository/topic-repository.service';
import { UserRepositoryService } from './user/user-repository.service';
import { User, UserSchema } from './user/user.schema';
import { UserController } from './user/user.controller';

@Module({
  imports: [
    HttpModule,
    MongooseModule.forRoot('mongodb://cpc_mongo/coin'),
    MongooseModule.forFeature([
      { name: Topic.name, schema: TopicSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [AppController, UserController],
  providers: [
    AppService,
    ScrapperService,
    ContentParserService,
    TfidfService,
    TopicRepositoryService,
    UserRepositoryService,
  ],
})
export class AppModule {}
