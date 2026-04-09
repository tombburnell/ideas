import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ActionType,
  Prisma,
  QuotaPeriod,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

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
  features: Record<string, boolean>;
  quotas: Record<
    string,
    { limit: number; period: QuotaPeriod }
  >;
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
            features: { include: { feature: true } },
            quotas: true,
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

    const features: Record<string, boolean> = {};
    const quotas: Record<string, { limit: number; period: QuotaPeriod }> = {};

    if (sub) {
      for (const pf of sub.plan.features) {
        if (pf.feature.active) {
          features[pf.feature.key] = pf.enabled;
        }
      }
      for (const q of sub.plan.quotas) {
        quotas[q.key] = { limit: q.limitValue, period: q.period };
      }
    }

    for (const o of overrides) {
      if (o.featureKey != null && o.enabled != null) {
        features[o.featureKey] = o.enabled;
      }
      if (o.quotaKey != null && o.quotaOverride != null) {
        quotas[o.quotaKey] = {
          limit: o.quotaOverride,
          period: QuotaPeriod.BILLING_PERIOD,
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
      quotas,
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
