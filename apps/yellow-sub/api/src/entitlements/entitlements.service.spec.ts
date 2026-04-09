import { Test } from '@nestjs/testing';
import { QuotaPeriod, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EntitlementsService } from './entitlements.service';

describe('EntitlementsService', () => {
  it('merges plan features with overrides', async () => {
    const prisma = {
      tenant: {
        findUniqueOrThrow: jest.fn().mockResolvedValue({ id: 't1', slug: 'acme' }),
      },
      externalUser: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'eu1',
          externalUserId: 'ext-1',
          email: 'a@b.com',
        }),
      },
      subscription: {
        findFirst: jest.fn().mockResolvedValue({
          status: SubscriptionStatus.ACTIVE,
          plan: {
            key: 'pro',
            name: 'Pro',
            features: [
              {
                enabled: true,
                feature: { key: 'f1', active: true },
              },
            ],
            quotas: [{ key: 'q1', limitValue: 10, period: QuotaPeriod.MONTH }],
          },
          cancelAtPeriodEnd: false,
          currentPeriodEnd: new Date('2026-01-01'),
        }),
      },
      manualEntitlementOverride: {
        findMany: jest.fn().mockResolvedValue([
          { featureKey: 'f1', enabled: false, quotaKey: null, quotaOverride: null },
        ]),
      },
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        EntitlementsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    const s = moduleRef.get(EntitlementsService);
    const r = await s.resolveForExternalUser('t1', 'ext-1');
    expect(r.features.f1).toBe(false);
    expect(r.quotas.q1.limit).toBe(10);
  });
});
