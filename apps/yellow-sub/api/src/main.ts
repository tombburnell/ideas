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
  const expressApp = app.getHttpAdapter().getInstance() as express.Application;
  // If VITE_FIREBASE_AUTH_DOMAIN was set to a custom host, Google redirects to
  // https://custom/__/auth/handler — which hits this app and 404s. Firebase only
  // serves /__/auth/handler on *.firebaseapp.com; forward the query string there.
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    if (req.method !== 'GET' || req.path !== '/__/auth/handler') {
      return next();
    }
    const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
    if (!projectId) {
      logger.warn('GET /__/auth/handler but FIREBASE_PROJECT_ID unset; cannot redirect to Firebase handler');
      return next();
    }
    const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const target = `https://${projectId}.firebaseapp.com/__/auth/handler${qs}`;
    logger.log(`redirecting OAuth completion to Firebase handler (custom authDomain fix)`);
    return res.redirect(302, target);
  });

  const appConfig = app.get(ConfigService<AppConfiguration, true>);
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
    `listening on 0.0.0.0:${port} publicBaseUrl=${publicBaseUrl} adminStatic=${adminStatic ? 'yes' : 'no'} firebaseAdmin=${firebaseConfigured ? 'yes' : 'no'} logHttp=${appConfig.get('logHttp', { infer: true })}`,
  );
  await app.listen(port, '0.0.0.0');
}

bootstrap().catch((err) => {
  console.error(err);
  process.exit(1);
});
