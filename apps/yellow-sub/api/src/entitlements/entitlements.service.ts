import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActionType,
  Prisma,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type ResolvedFeature = {
  type: 'BOOLEAN' | 'LIMIT' | 'CONFIG';
  includedAmount?: number | null;
  softLimit?: number | null;
  hardLimit?: number | null;
  period?: string;
  configValue?: string;
  tierMode?: 'GRADUATED' | 'VOLUME';
  tiers?: { from: number; to: number | null; unitPrice: number; flatFee: number; currency: string }[];
};

export type ResolvedEntitlements = {
  tenant: { id: string; slug: string };
  user: { externalUserId: string; email: string | null };
  subscription: {
    status: SubscriptionStatus;
    planKey: string;
    planName: string;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  } | null;
  features: Record<string, ResolvedFeature>;
  actions: {
    canUpgrade: boolean;
    canDowngrade: boolean;
    canCancel: boolean;
    manageUrl: string | null;
  };
};

@Injectable()
export class EntitlementsService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveForExternalUser(
    tenantId: string,
    externalUserId: string,
    manageUrl?: string | null,
  ): Promise<ResolvedEntitlements> {
    const tenant = await this.prisma.tenant.findUniqueOrThrow({
      where: { id: tenantId },
    });
    const user = await this.prisma.externalUser.findUnique({
      where: {
        tenantId_externalUserId: { tenantId, externalUserId },
      },
    });
    if (!user) {
      throw new NotFoundException('User not registered');
    }

    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        externalUserIdRef: user.id,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
            SubscriptionStatus.INCOMPLETE,
          ],
        },
      },
      include: {
        plan: {
          include: {
            features: { include: { feature: true, tiers: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const overrides = await this.prisma.manualEntitlementOverride.findMany({
      where: {
        tenantId,
        externalUserIdRef: user.id,
        OR: [{ endsAt: null }, { endsAt: { gte: new Date() } }],
      },
    });

    const features: Record<string, ResolvedFeature> = {};

    if (sub) {
      for (const pf of sub.plan.features) {
        if (!pf.feature.active) continue;
        const resolved: ResolvedFeature = { type: pf.feature.type };
        if (pf.feature.type === 'LIMIT') {
          resolved.includedAmount = pf.includedAmount;
          resolved.softLimit = pf.softLimit;
          resolved.hardLimit = pf.hardLimit;
          resolved.period = pf.limitPeriod ?? undefined;
          if (pf.tierMode) {
            resolved.tierMode = pf.tierMode;
            resolved.tiers = pf.tiers.map((t) => ({
              from: t.fromUnit,
              to: t.toUnit,
              unitPrice: t.unitPriceMinor,
              flatFee: t.flatFeeMinor,
              currency: t.currency,
            }));
          }
        } else if (pf.feature.type === 'CONFIG') {
          resolved.configValue = pf.configValue ?? undefined;
        }
        features[pf.feature.key] = resolved;
      }
    }

    for (const o of overrides) {
      if (o.featureKey != null && o.enabled != null) {
        if (o.enabled) {
          features[o.featureKey] = features[o.featureKey] ?? { type: 'BOOLEAN' };
        } else {
          delete features[o.featureKey];
        }
      }
      if (o.quotaKey != null && o.quotaOverride != null) {
        features[o.quotaKey] = {
          ...features[o.quotaKey],
          type: 'LIMIT',
          hardLimit: o.quotaOverride,
        };
      }
    }

    const activeStatuses: SubscriptionStatus[] = [
      SubscriptionStatus.ACTIVE,
      SubscriptionStatus.TRIALING,
      SubscriptionStatus.PAST_DUE,
    ];
    const activeLike = sub && activeStatuses.includes(sub.status);

    return {
      tenant: { id: tenant.id, slug: tenant.slug },
      user: { externalUserId: user.externalUserId, email: user.email },
      subscription: sub
        ? {
            status: sub.status,
            planKey: sub.plan.key,
            planName: sub.plan.name,
            currentPeriodEnd: sub.currentPeriodEnd?.toISOString() ?? null,
            cancelAtPeriodEnd: sub.cancelAtPeriodEnd,
          }
        : null,
      features,
      actions: {
        canUpgrade: !!activeLike,
        canDowngrade: !!activeLike,
        canCancel: !!activeLike,
        manageUrl: manageUrl ?? null,
      },
    };
  }

  async logAction(
    tenantId: string,
    type: ActionType,
    status: string,
    opts: {
      subscriptionId?: string;
      externalUserIdRef?: string;
      actorType: string;
      actorRef?: string;
      request?: Prisma.InputJsonValue;
      response?: Prisma.InputJsonValue;
    },
  ): Promise<void> {
    await this.prisma.subscriptionActionLog.create({
      data: {
        tenantId,
        subscriptionId: opts.subscriptionId,
        externalUserIdRef: opts.externalUserIdRef,
        actionType: type,
        actorType: opts.actorType,
        actorRef: opts.actorRef,
        requestPayload: opts.request,
        responsePayload: opts.response,
        status,
      },
    });
  }
}
