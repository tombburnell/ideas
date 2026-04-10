import { Injectable, Logger, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { AppConfiguration } from '../config/configuration';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private readonly log = new Logger(FirebaseAdminService.name);
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  onModuleInit(): void {
    const json = this.config.get('firebaseServiceAccountJson', { infer: true });
    const projectId = this.config.get('firebaseProjectId', { infer: true });
    if (!json && !projectId) {
      this.log.warn('Firebase Admin not initialized: set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID');
      return;
    }
    if (admin.apps.length === 0) {
      if (json) {
        const cred = JSON.parse(json) as admin.ServiceAccount;
        this.app = admin.initializeApp({ credential: admin.credential.cert(cred) });
        this.log.log(
          `Firebase Admin initialized with service account (projectId=${cred.projectId ?? projectId})`,
        );
      } else if (projectId) {
        this.app = admin.initializeApp({ projectId });
        this.log.log(`Firebase Admin initialized with projectId=${projectId}`);
      }
    } else {
      this.app = admin.app();
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      this.log.warn('verifyIdToken rejected: Firebase Admin not configured');
      throw new UnauthorizedException('Firebase is not configured');
    }
    try {
      const decoded = await admin.auth().verifyIdToken(idToken);
      this.log.log(`admin id_token ok uid=${decoded.uid} email=${decoded.email ?? 'none'}`);
      return decoded;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`verifyIdToken failed: ${msg}`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
