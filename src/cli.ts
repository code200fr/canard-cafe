import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';
import * as process from 'process';
import path from 'path';
import {
  ParsedData,
  ParsedIndex,
  UserIdIndex,
  UserNameIndex,
} from './content-parser/parsed-index';
import {
  ProcessorFactoryService,
  ProcessorsData,
} from './processor/processor-factory.service';
import { TopicRepositoryService } from './topic/topic-repository.service';
import { UserRepositoryService } from './user/user-repository.service';
import {
  ProcessedQuotes,
  UserQuotes,
} from './processor/quote/quote-processor.service';

enum Action {
  Scrap = 'scrap',
  Parse = 'parse',
  Process = 'process',
  Persist = 'persist',
  Graph = 'graph',
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
    case Action.Graph:
      await graph(app);
      break;
  }

  logger.log('☑️ Done');

  await app.close();
}

async function graph(app: INestApplicationContext) {
  const data: ParsedData = JSON.parse(
    fs.readFileSync('./var/data.json', 'utf-8'),
  );

  const PostCountThreshold = 100;

  const factory: ProcessorFactoryService = app.get(ProcessorFactoryService);
  const index: ParsedIndex = new ParsedIndex().unSerialize(data);
  const userIdIndex: UserIdIndex = index.getUserIdIndex();
  const countIndex: Map<number, number> = index.getPostCountIndex();

  const allQuotes: ProcessedQuotes = (await factory
    .getProcessor('quote')
    .run(index)) as ProcessedQuotes;

  const quotes = allQuotes.from;
  const posIndex: Map<string, number> = new Map<string, number>();
  const csvData: number[][] = [];
  let maxQuote = 0;

  let n = 0;
  quotes.forEach((userQuotes: UserQuotes, userId: number) => {
    if (!userIdIndex.hasOwnProperty(userId)) {
      return;
    }

    if (countIndex.get(userId) < PostCountThreshold) {
      return;
    }

    posIndex.set(userIdIndex[userId], n);
    n++;
  });

  quotes.forEach((userQuotes: UserQuotes, userId: number) => {
    for (const quotedName in userQuotes) {
      if (!posIndex.has(quotedName)) {
        continue;
      }

      const fromPos: number = posIndex.get(userIdIndex[userId]);
      const toPos: number = posIndex.get(quotedName);

      if (!csvData[fromPos]) {
        csvData[fromPos] = new Array(posIndex.size).fill(0);
      }

      csvData[fromPos][toPos] = userQuotes[quotedName];

      if (userQuotes[quotedName] > maxQuote) {
        maxQuote = userQuotes[quotedName];
      }
    }
  });

  const escapeField = (userName: string): string => {
    return '"' + userName.replace(/"/g, '""') + '"';
  };

  let header = '';
  const lines: string[] = [];

  const userNames = Array.from(posIndex.keys());

  userNames.forEach((username: string) => {
    header += ';' + escapeField(username);
  });

  csvData.forEach((line: number[], idx: number) => {
    const threshold = line.map((count: number) => {
      if (count < 10) return 0;
      return count;
    });

    lines.push(escapeField(userNames[idx]) + ';' + threshold.join(';'));
  });

  const csv = header + '\n' + lines.join('\n');
  const outFile: string = path.join(process.cwd(), 'var', 'graph.csv');

  logger.log(`Writing file to ${outFile}`);

  fs.writeFileSync(outFile, csv);

  return Promise.resolve(true);
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

  parser.minAge = 1577833200000;

  console.time('Parsing data');
  let n = 0;
  const m = dirs.length;

  for (const dir of dirs) {
    const id: number = parseInt(dir, 10);
    await parser.parseTopic(id, index);

    n++;
    logger.log(`Parsed #${id}: ${n}/${m}`);
  }

  logger.log('Building quotes index');
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
