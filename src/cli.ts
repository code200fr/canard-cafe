import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext, Logger } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';
import * as process from 'process';
import path from 'path';
import { TfidfService, VectorMap } from './processor/tfidf/tfidf.service';
import { TfidfDocument } from './processor/tfidf/tfidf-document';

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
  const documents: TfidfDocument[] = [];

  data.forEach((pages: ParsedTopicPage[]) => {
    documents.push(tfidf.buildTopicDocument(pages));
  });

  const vectors: VectorMap[] = tfidf.computeVectors(documents);

  documents.forEach((document: TfidfDocument, index: number) => {
    logger.debug(data[index][0].topic.title);
    logger.debug(
      tfidf
        .getTopTokens(vectors, index, 100)
        .map((value: [string, number]) => value[0])
        .join(', '),
    );
  });
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
