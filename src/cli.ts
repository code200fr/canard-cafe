import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';
import * as process from 'process';
import path from 'path';
import { TfidfService, TopicTokens } from './processor/tfidf/tfidf.service';
import { TopicRepositoryService } from './topic/topic-repository/topic-repository.service';
import { Topic } from './schemas/topic.schema';

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
  const data: ParsedTopicPage[][] = JSON.parse(
    fs.readFileSync('./var/data.json', 'utf-8'),
  );

  const tfidf: TfidfService = app.get(TfidfService);
  const repo: TopicRepositoryService = app.get(TopicRepositoryService);
  logger.log('Processing data');

  const tokens: TopicTokens[] = tfidf.fromData(data);

  await repo.truncate();

  const promises: Promise<Topic>[] = [];

  logger.log('Persisting data');

  data.forEach((pages: ParsedTopicPage[], index: number) => {
    const p = repo
      .create(pages[0].topic, tokens[index])
      .catch((e) => {
        logger.error(e);
        throw e;
      })
      .then((topic: Topic) => {
        logger.debug(`Created document : ${topic.title}`);
        return topic;
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
    .slice(0, 30);

  const parser: ContentParserService = app.get(ContentParserService);
  const data: ParsedTopicPage[][] = [];

  console.time('Parsing data');
  let n = 0;
  const m = dirs.length;

  for (const dir of dirs) {
    const id: number = parseInt(dir, 10);
    const pages: ParsedTopicPage[] = await parser.parseTopic(id);
    data.push(pages);

    n++;
    logger.log(`Parsed #${id}: ${n}/${m}`);
  }

  console.timeEnd('Parsing data');

  fs.writeFileSync(path.join('./var', 'data.json'), JSON.stringify(data));
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
