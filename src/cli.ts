import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';
import * as process from 'process';
import path from 'path';
import { ParsedData, ParsedIndex } from './content-parser/parsed-index';
import {
  ProcessorFactoryService,
  ProcessorsData,
} from './processor/processor-factory.service';
import { TopicRepositoryService } from './topic/topic-repository.service';
import { UserRepositoryService } from './user/user-repository.service';

enum Action {
  Scrap = 'scrap',
  Parse = 'parse',
  Process = 'process',
  Persist = 'persist',
}

const logger: Logger = new Logger('CLI');
const args: string[] = process.argv.slice(2);

async function bootstrap() {
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
    case Action.Persist:
      await persist(app);
      break;
  }

  logger.log('☑️ Done');
  await app.close();
}

async function persist(app: INestApplicationContext) {
  const data: ParsedData = JSON.parse(
    fs.readFileSync('./var/data.json', 'utf-8'),
  );

  const factory: ProcessorFactoryService = app.get(ProcessorFactoryService);
  const index: ParsedIndex = new ParsedIndex().unSerialize(data);
  const processors: ProcessorsData = new Map<string, unknown>();

  factory.names().forEach((processorName: string) => {
    const processorDataPath: string = path.join(
      process.cwd(),
      'var',
      'processed',
      `${processorName}.json`,
    );

    if (!fs.existsSync(processorDataPath)) {
      throw `Missing ${processorName} data`;
    }

    const rawData: string = fs.readFileSync(processorDataPath, 'utf8');
    const processorData: unknown = JSON.parse(rawData);
    processors.set(processorName, processorData);
  });

  const topicRepo: TopicRepositoryService = app.get(TopicRepositoryService);
  const userRepo: UserRepositoryService = app.get(UserRepositoryService);

  logger.log('Importing topics...');
  await topicRepo.importAll(index, processors);

  logger.log('Importing users...');
  await userRepo.importAll(index, processors);
}

async function runProcess(app: INestApplicationContext) {
  const data: ParsedData = JSON.parse(
    fs.readFileSync('./var/data.json', 'utf-8'),
  );

  const index: ParsedIndex = new ParsedIndex().unSerialize(data);
  const factory: ProcessorFactoryService = app.get(ProcessorFactoryService);

  const persistDir: string = path.join(process.cwd(), 'var', 'processed');

  if (!fs.existsSync(persistDir)) {
    fs.mkdirSync(persistDir);
  }

  const jsonReplacer = (key: string, value: unknown) => {
    if (value instanceof Map) {
      return Array.from(value).reduce((obj, [key, value]) => {
        obj[key] = value;
        return obj;
      }, {});
    } else {
      return value;
    }
  };

  const processorName: string = args[1];

  if (factory.hasProcessor(processorName)) {
    logger.log(`▶️ Processor ${processorName} has started`);
    const processorData: unknown = await factory.run(processorName, index);

    fs.writeFileSync(
      path.join(persistDir, `${processorName}.json`),
      JSON.stringify(processorData, jsonReplacer),
    );
  }
}

async function parse(app: INestApplicationContext) {
  const dirs: string[] = fs
    .readdirSync('./var/raw', {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);

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
