import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScrapperService } from './scrapper/scrapper.service';
import { ContentParserService } from './content-parser/content-parser.service';
import { TfidfService } from './processor/tfidf/tfidf.service';

@Module({
  imports: [HttpModule],
  controllers: [AppController],
  providers: [AppService, ScrapperService, ContentParserService, TfidfService],
})
export class AppModule {}
