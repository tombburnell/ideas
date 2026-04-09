import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'node:path';
import express, { type Request, type Response } from 'express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    }),
  );

  const adminDist = process.env.ADMIN_DIST_PATH;
  if (adminDist) {
    const root = join(process.cwd(), adminDist);
    const expressApp = app.getHttpAdapter().getInstance() as express.Application;
    expressApp.use('/admin', express.static(root));
    expressApp.get('/admin', (_req: Request, res: Response) => {
      res.sendFile(join(root, 'index.html'));
    });
    expressApp.use(/^\/admin\/.*/, (_req: Request, res: Response) => {
      res.sendFile(join(root, 'index.html'));
    });
  }

  const config = new DocumentBuilder()
    .setTitle('Yellow Sub')
    .setDescription('Subscription and entitlements middleware API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' })
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = parseInt(process.env.PORT ?? '4000', 10);
  await app.listen(port, '0.0.0.0');
}

bootstrap();
