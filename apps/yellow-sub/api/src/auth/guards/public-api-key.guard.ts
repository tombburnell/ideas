import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyService } from '../api-key.service';

/** Expects route param tenantSlug and validates X-Api-Key for that tenant. */
@Injectable()
export class PublicApiKeyGuard implements CanActivate {
  private readonly log = new Logger(PublicApiKeyGuard.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeys: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; params: { tenantSlug: string } }>();
    const raw =
      req.headers['x-api-key'] ??
      (req.headers.authorization?.startsWith('Bearer ')
        ? req.headers.authorization.slice(7)
        : undefined);
    if (!raw) {
      this.log.warn(`public api 401: missing X-Api-Key tenantSlug=${req.params?.tenantSlug ?? '-'}`);
      throw new UnauthorizedException('Missing API key');
    }
    const tenantSlug = req.params?.tenantSlug;
    if (!tenantSlug) {
      this.log.warn('public api 401: missing tenant slug in route');
      throw new UnauthorizedException('Missing tenant');
    }
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, active: true },
    });
    if (!tenant) {
      this.log.warn(`public api 401: unknown tenant slug=${tenantSlug}`);
      throw new UnauthorizedException('Unknown tenant');
    }
    await this.apiKeys.validateForTenant(tenant.id, raw, tenantSlug);
    (req as { tenantId?: string; tenantSlug?: string }).tenantId = tenant.id;
    (req as { tenantId?: string; tenantSlug?: string }).tenantSlug = tenant.slug;
    return true;
  }
}
