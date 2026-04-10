import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';

const BCRYPT_ROUNDS = 12;

@Injectable()
export class ApiKeyService {
  private readonly log = new Logger(ApiKeyService.name);

  constructor(private readonly prisma: PrismaService) {}

  /** Returns full key once (for creation response). */
  generateRawKey(): string {
    const buf = Buffer.allocUnsafe(32);
    for (let i = 0; i < buf.length; i++) buf[i] = Math.floor(Math.random() * 256);
    return `ys_${buf.toString('base64url')}`;
  }

  async hashKey(raw: string): Promise<string> {
    return bcrypt.hash(raw, BCRYPT_ROUNDS);
  }

  keyPrefix(raw: string): string {
    return raw.length > 12 ? raw.slice(0, 12) : raw;
  }

  async validateForTenant(
    tenantId: string,
    rawKey: string,
    tenantSlug?: string,
  ): Promise<void> {
    const prefix = this.keyPrefix(rawKey);
    const candidates = await this.prisma.tenantApiKey.findMany({
      where: { tenantId, active: true, keyPrefix: prefix },
    });
    for (const row of candidates) {
      const ok = await bcrypt.compare(rawKey, row.keyHash);
      if (ok) {
        await this.prisma.tenantApiKey.update({
          where: { id: row.id },
          data: { lastUsedAt: new Date() },
        });
        return;
      }
    }
    this.log.warn(
      `api key rejected tenant=${tenantSlug ?? tenantId} keyPrefix=${prefix}`,
    );
    throw new UnauthorizedException('Invalid API key');
  }
}
