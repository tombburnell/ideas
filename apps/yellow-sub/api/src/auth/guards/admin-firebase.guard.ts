import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import type { AppConfiguration } from '../../config/configuration';
import { FirebaseAdminService } from '../firebase-admin.service';

@Injectable()
export class AdminFirebaseGuard implements CanActivate {
  constructor(
    private readonly firebase: FirebaseAdminService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService<AppConfiguration, true>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
    }>();
    const auth = req.headers.authorization;
    if (!auth?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token');
    }
    const token = auth.slice(7);
    const decoded = await this.firebase.verifyIdToken(token);
    const email = decoded.email?.toLowerCase();
    if (!email) {
      throw new UnauthorizedException('Email required');
    }
    const allow = this.config.get('adminEmailAllowlist', { infer: true });
    if (allow.length > 0 && !allow.includes(email)) {
      throw new UnauthorizedException('Email not in allowlist');
    }
    const scopes = await this.prisma.adminScope.findMany({ where: { email } });
    (req as { adminEmail?: string; adminScopes?: typeof scopes }).adminEmail = email;
    (req as { adminEmail?: string; adminScopes?: typeof scopes }).adminScopes = scopes;
    return true;
  }
}
