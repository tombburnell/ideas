import { Test } from '@nestjs/testing';
import { SubscriptionStatus } from '@prisma/client';
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
                feature: { key: 'f1', active: true, type: 'BOOLEAN' },
                includedAmount: null,
                softLimit: null,
                hardLimit: null,
                limitPeriod: null,
                tierMode: null,
                configValue: null,
                tiers: [],
              },
              {
                feature: { key: 'q1', active: true, type: 'LIMIT' },
                includedAmount: 10,
                softLimit: 8,
                hardLimit: 10,
                limitPeriod: 'MONTH',
                tierMode: null,
                configValue: null,
                tiers: [],
              },
            ],
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
    expect(r.features.f1).toBeUndefined();
    expect(r.features.q1).toEqual({
      type: 'LIMIT',
      includedAmount: 10,
      softLimit: 8,
      hardLimit: 10,
      period: 'MONTH',
    });
  });
});
