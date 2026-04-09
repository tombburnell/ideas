import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async registerOrSync(
    tenantId: string,
    body: {
      externalUserId: string;
      email?: string;
      displayName?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    const now = new Date();
    const user = await this.prisma.externalUser.upsert({
      where: {
        tenantId_externalUserId: {
          tenantId,
          externalUserId: body.externalUserId,
        },
      },
      create: {
        tenantId,
        externalUserId: body.externalUserId,
        email: body.email,
        displayName: body.displayName,
        metadata: body.metadata as object | undefined,
        firstSeenAt: now,
        lastSeenAt: now,
      },
      update: {
        email: body.email ?? undefined,
        displayName: body.displayName ?? undefined,
        metadata: body.metadata as object | undefined,
        lastSeenAt: now,
      },
    });
    return { id: user.id, externalUserId: user.externalUserId, email: user.email };
  }
}
