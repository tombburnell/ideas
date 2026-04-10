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

  if (appConfig.get('logHttp', { infer: true })) {
    app.use(httpLoggingMiddleware);
  }

  // Wrong path typo: __firebase vs __/firebase (SDK / copy-paste)
  expressApp.get('/__firebase/init.json', (_req: Request, res: Response) => {
    res.redirect(301, '/__/firebase/init.json');
  });

  /** Public: confirms OAuth redirect config (Firebase sign-in itself is browser-only until /api/v1/admin/*). */
  expressApp.get('/auth/debug', (_req: Request, res: Response) => {
    const webKey = appConfig.get('firebaseWebApiKey', { infer: true });
    const authDom = appConfig.get('firebaseAuthDomain', { infer: true });
    res.json({
      firebaseProjectId: firebaseProjectId || null,
      oauthHandlerRedirectConfigured: Boolean(firebaseProjectId),
      firebaseInitJsonReady: Boolean(webKey && firebaseProjectId && authDom),
      authDomainForInitJson: authDom || null,
      hint:
        'Use authDomain = your public host (yellowsub.vibedust.com) and set FIREBASE_WEB_API_KEY same as VITE_FIREBASE_API_KEY so GET /__/firebase/init.json works without Firebase Hosting. Domain must be *.firebaseapp.com not *.firebase.com.',
    });
  });

  /**
   * Firebase Hosting serves this for SDK helpers; without Hosting the SDK may 404 here and break auth.
   * Set FIREBASE_WEB_API_KEY (same as VITE_FIREBASE_API_KEY) and PUBLIC_BASE_URL (or FIREBASE_AUTH_DOMAIN).
   */
  expressApp.get('/__/firebase/init.json', (_req: Request, res: Response) => {
    const raw = appConfig.get('firebaseWebConfigJson', { infer: true });
    if (raw) {
      try {
        JSON.parse(raw);
        res.type('application/json').send(raw);
        return;
      } catch {
        logger.warn('FIREBASE_WEB_CONFIG_JSON is invalid JSON');
      }
    }
    const apiKey = appConfig.get('firebaseWebApiKey', { infer: true });
    const pid = appConfig.get('firebaseProjectId', { infer: true }).trim();
    const authDomain = appConfig.get('firebaseAuthDomain', { infer: true }).trim();
    if (!apiKey || !pid || !authDomain) {
      const missing: string[] = [];
      if (!apiKey) missing.push('FIREBASE_WEB_API_KEY');
      if (!pid) missing.push('FIREBASE_PROJECT_ID (or project_id in FIREBASE_SERVICE_ACCOUNT_JSON)');
      if (!authDomain) missing.push('PUBLIC_BASE_URL (e.g. https://yellowsub.vibedust.com) or FIREBASE_AUTH_DOMAIN');
      logger.warn(`GET /__/firebase/init.json 503 missing: ${missing.join(', ')}`);
      res.status(503).type('application/json').json({
        error: 'init.json requires API runtime env vars on this server (Coolify → application → Environment)',
        missing,
        fix: {
          FIREBASE_WEB_API_KEY: 'Same string as VITE_FIREBASE_API_KEY from Firebase Console web app',
          FIREBASE_PROJECT_ID: 'e.g. yellowsub-fbb1c',
          PUBLIC_BASE_URL: 'https://yellowsub.vibedust.com (no trailing slash) so authDomain resolves',
        },
      });
      return;
    }
    res.type('application/json').json({
      apiKey,
      authDomain,
      projectId: pid,
    });
  });

  // If OAuth returns to https://custom/__/auth/handler, forward to Firebase's handler.
  expressApp.use((req: Request, res: Response, next: NextFunction) => {
    const pathname = (req.originalUrl ?? req.url ?? '').split('?')[0];
    if (req.method !== 'GET' || pathname !== '/__/auth/handler') {
      return next();
    }
    const host = req.headers.host ?? '-';
    logger.log(`OAuth return hit this server: GET /__/auth/handler host=${host}`);
    if (!firebaseProjectId) {
      logger.warn(
        'Cannot redirect to Firebase: firebaseProjectId empty — set FIREBASE_PROJECT_ID (or project_id in FIREBASE_SERVICE_ACCOUNT_JSON)',
      );
      return next();
    }
    // OAuth response may be in location.hash (not sent to server). A 302 Location URL
    // cannot include the fragment — we must redirect in the browser so hash is preserved.
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Redirecting…</title></head><body>
<script>(function(){var b=${JSON.stringify(`https://${firebaseProjectId}.firebaseapp.com/__/auth/handler`)};location.replace(b+(location.search||'')+(location.hash||''));})();</script>
<p>Completing sign-in…</p></body></html>`;
    logger.log(
      `OAuth /__/auth/handler: sending client-side redirect to firebaseapp (preserves hash) project=${firebaseProjectId}`,
    );
    res.type('html').send(html);
    return;
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
