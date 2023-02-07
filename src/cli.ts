import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ScrapperService } from './scrapper/scrapper.service';
import * as fs from 'fs';
import { INestApplicationContext } from '@nestjs/common';
import { ContentParserService } from './content-parser/content-parser.service';

enum Action {
  Scrap = 'scrap',
  Parse = 'parse',
}

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
  }

  await app.close();
}

async function parse(app: INestApplicationContext) {
  const dirs: string[] = fs
    .readdirSync('./var/raw', {
      withFileTypes: true,
    })
    .filter((dir) => dir.isDirectory())
    .map((dir) => dir.name);

  const parser: ContentParserService = app.get(ContentParserService);

  for (const dir of dirs) {
    console.log(dir);
    const id: number = parseInt(dir, 10);
    await parser.parseTopic(id);
  }
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
