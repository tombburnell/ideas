import { Injectable, OnModuleInit, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
import type { AppConfiguration } from '../config/configuration';

@Injectable()
export class FirebaseAdminService implements OnModuleInit {
  private app: admin.app.App | null = null;

  constructor(private readonly config: ConfigService<AppConfiguration, true>) {}

  onModuleInit(): void {
    const json = this.config.get('firebaseServiceAccountJson', { infer: true });
    const projectId = this.config.get('firebaseProjectId', { infer: true });
    if (!json && !projectId) {
      return;
    }
    if (admin.apps.length === 0) {
      if (json) {
        const cred = JSON.parse(json) as admin.ServiceAccount;
        this.app = admin.initializeApp({ credential: admin.credential.cert(cred) });
      } else if (projectId) {
        this.app = admin.initializeApp({ projectId });
      }
    } else {
      this.app = admin.app();
    }
  }

  async verifyIdToken(idToken: string): Promise<admin.auth.DecodedIdToken> {
    if (!this.app) {
      throw new UnauthorizedException('Firebase is not configured');
    }
    return admin.auth().verifyIdToken(idToken);
  }
}
