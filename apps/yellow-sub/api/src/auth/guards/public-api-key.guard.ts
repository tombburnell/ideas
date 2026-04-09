import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyService } from '../api-key.service';

/** Expects route param tenantSlug and validates X-Api-Key for that tenant. */
@Injectable()
export class PublicApiKeyGuard implements CanActivate {
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
      throw new UnauthorizedException('Missing API key');
    }
    const tenantSlug = req.params?.tenantSlug;
    if (!tenantSlug) {
      throw new UnauthorizedException('Missing tenant');
    }
    const tenant = await this.prisma.tenant.findFirst({
      where: { slug: tenantSlug, active: true },
    });
    if (!tenant) {
      throw new UnauthorizedException('Unknown tenant');
    }
    await this.apiKeys.validateForTenant(tenant.id, raw);
    (req as { tenantId?: string; tenantSlug?: string }).tenantId = tenant.id;
    (req as { tenantId?: string; tenantSlug?: string }).tenantSlug = tenant.slug;
    return true;
  }
}
