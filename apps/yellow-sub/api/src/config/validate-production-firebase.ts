import { Logger } from '@nestjs/common';
import type { AppConfiguration } from './configuration';
import type { ConfigService } from '@nestjs/config';

/**
 * When serving the admin SPA in production, refuse to start without env needed for
 * GET /__/firebase/init.json and OAuth redirects.
 */
export function assertProductionFirebaseEnv(
  appConfig: ConfigService<AppConfiguration, true>,
  logger: Logger,
): void {
  const nodeEnv = appConfig.get('nodeEnv', { infer: true });
  const adminDist = appConfig.get('adminStaticPath', { infer: true });
  if (nodeEnv !== 'production' || !adminDist) {
    return;
  }
  const webKey = appConfig.get('firebaseWebApiKey', { infer: true });
  const pid = appConfig.get('firebaseProjectId', { infer: true }).trim();
  const authDom = appConfig.get('firebaseAuthDomain', { infer: true }).trim();
  const missing: string[] = [];
  if (!webKey) missing.push('FIREBASE_WEB_API_KEY');
  if (!pid) missing.push('FIREBASE_PROJECT_ID');
  if (!authDom) missing.push('PUBLIC_BASE_URL or FIREBASE_AUTH_DOMAIN');
  if (missing.length === 0) {
    logger.log(`production admin: Firebase web env ok (init.json + OAuth)`);
    return;
  }
  const msg = `Production admin requires: ${missing.join(', ')}. Set in Coolify (same values as VITE_* for the web key + PUBLIC_BASE_URL).`;
  logger.error(msg);
  throw new Error(msg);
}
