import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as process from 'process';
import { NestExpressApplication } from '@nestjs/platform-express';
import path from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  console.log(path.join(__dirname, '..', 'front'));
  app.useStaticAssets(path.join(__dirname, '..', 'front'));
  await app.listen(process.env.APP_INTERNAL_PORT);
}
bootstrap();
