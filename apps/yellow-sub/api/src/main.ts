import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { join } from 'node:path';
import express, { type NextFunction, type Request, type Response } from 'express';
import { AppModule } from './app.module';
import type { AppConfiguration } from './config/configuration';
import { httpLoggingMiddleware } from './common/logging/http-logging.middleware';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    rawBody: true,
  });
  const appConfig = app.get(ConfigService<AppConfiguration, true>);
  const expressApp = app.getHttpAdapter().getInstance() as express.Application;
  const firebaseProjectId = appConfig.get('firebaseProjectId', { infer: true }).trim();
  // If OAuth returns to https://custom/__/auth/handler, forward to Firebase's handler.
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    const pathname = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (req.method !== 'GET' || pathname !== '/__/auth/handler') {
      return next();
    }
    if (!firebaseProjectId) {
      logger.warn(
        'GET /__/auth/handler but firebaseProjectId empty — set FIREBASE_PROJECT_ID in Coolify',
      );
      return next();
    }
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const target = `https://${firebaseProjectId}.firebaseapp.com/__/auth/handler${qs}`;
    logger.log(`redirect /__/auth/handler -> firebaseapp (${firebaseProjectId})`);
    return res.redirect(302, target);
  });
  if (appConfig.get('logHttp', { infer: true })) {
    app.use(httpLoggingMiddleware);
  }
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
    expressApp.use('/admin', express.static(root));
    expressApp.get('/admin', (_req: Request, res: Response) => {
      res.sendFile(join(root, 'index.html'));
    });
    expressApp.use(/^\/admin\/.*/, (_req: Request, res: Response) => {
      res.sendFile(join(root, 'index.html'));
    });
  }

  const openApiConfig = new DocumentBuilder()
    .setTitle('Yellow Sub')
    .setDescription('Subscription and entitlements middleware API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'X-Api-Key', in: 'header' })
    .build();
  const document = SwaggerModule.createDocument(app, openApiConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = appConfig.get('port', { infer: true });
  const publicBaseUrl = appConfig.get('publicBaseUrl', { infer: true });
  const adminStatic = appConfig.get('adminStaticPath', { infer: true });
  const firebaseConfigured = Boolean(
    appConfig.get('firebaseProjectId', { infer: true }) ||
      appConfig.get('firebaseServiceAccountJson', { infer: true }),
  );
  logger.log(
    `listening on 0.0.0.0:${port} publicBaseUrl=${publicBaseUrl} adminStatic=${adminStatic ? 'yes' : 'no'} firebaseAdmin=${firebaseConfigured ? 'yes' : 'no'} oauthRedirectProjectId=${firebaseProjectId || 'MISSING'} logHttp=${appConfig.get('logHttp', { infer: true })}`,
  );
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
