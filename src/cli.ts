import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';
import * as process from 'process';
import path from 'path';
import {
  AllTokens,
  TfidfService,
  Tokens,
} from './processor/tfidf/tfidf.service';
import { TopicRepositoryService } from './topic/topic-repository/topic-repository.service';
import { Topic } from './topic/topic.schema';
import {
  ParsedData,
  ParsedIndex,
  ParsedTopic,
  ParsedUser,
} from './content-parser/parsed-index';
import { UserRepositoryService } from './user/user-repository.service';
import { User } from './user/user.schema';

enum Action {
  Scrap = 'scrap',
  Parse = 'parse',
  Process = 'process',
}

const logger: Logger = new Logger('CLI');

async function bootstrap() {
  const args: string[] = process.argv.slice(2);
  const app = await NestFactory.createApplicationContext(AppModule);
  const action: Action = args[0] as Action;

  switch (action) {
    case Action.Scrap:
      await scrap(app);
      break;
    case Action.Parse:
      await parse(app);
      break;
    case Action.Process:
      await runProcess(app);
      break;
  }

  await app.close();
}

async function runProcess(app: INestApplicationContext) {
  const data: ParsedData = JSON.parse(
    fs.readFileSync('./var/data.json', 'utf-8'),
  );

  const index: ParsedIndex = new ParsedIndex().unSerialize(data);
  const tfidf: TfidfService = app.get(TfidfService);
  logger.log('Processing data');

  const tokens: AllTokens = tfidf.allFromIndex(index);

  const promises: Promise<Topic | User>[] = [];

  logger.log('Persisting data');

  const topicRepo: TopicRepositoryService = app.get(TopicRepositoryService);
  const userRepo: UserRepositoryService = app.get(UserRepositoryService);

  await topicRepo.truncate();
  await userRepo.truncate();

  index.topics.forEach((topic: ParsedTopic) => {
    const p = topicRepo
      .create(topic, tokens.topics.get(topic.id))
      .catch((e) => {
        logger.error(e);
        throw e;
      })
      .then((topic: Topic) => {
        logger.debug(`Created topic document : ${topic.title}`);
        return topic;
      });

    promises.push(p);
  });

  index.users.forEach((user: ParsedUser) => {
    const p = userRepo
      .create(user, tokens.users.get(user.id))
      .catch((e) => {
        logger.error(e);
        throw e;
      })
      .then((user: User) => {
        logger.debug(`Created user document : ${user.name}`);
        return user;
      });

    promises.push(p);
  });

  return Promise.allSettled(promises);
}

async function parse(app: INestApplicationContext) {
  const dirs: string[] = fs
    .readdirSync('./var/raw', {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name)
    .slice(0, 150);

  const parser: ContentParserService = app.get(ContentParserService);
  const index: ParsedIndex = new ParsedIndex();

  console.time('Parsing data');
  let n = 0;
  const m = dirs.length;

  for (const dir of dirs) {
    const id: number = parseInt(dir, 10);
    await parser.parseTopic(id, index);

    n++;
    logger.log(`Parsed #${id}: ${n}/${m}`);
  }

  logger.log('Builder quotes index');
  parser.buildQuoteUserIndex(index);

  console.timeEnd('Parsing data');

  fs.writeFileSync(
    path.join('./var', 'data.json'),
    JSON.stringify(index.serialize()),
  );
}

async function scrap(app: INestApplicationContext) {
  const scrapper: ScrapperService = app.get(ScrapperService);
  const urlsData: string = fs.readFileSync('./var/urls.json', 'utf8');
  const urls: string[] = JSON.parse(urlsData);

  for (const topicUrl of urls) {
    await scrapper.loadTopic(topicUrl);
  }
}

bootstrap();
