import { Injectable, Logger } from '@nestjs/common';
import {
  BillingProvider,
  SubscriptionStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingProviderRegistry } from '../providers/billing/billing-provider.registry';

function mapLemonStatus(s: string): SubscriptionStatus {
  const m: Record<string, SubscriptionStatus> = {
    on_trial: SubscriptionStatus.TRIALING,
    active: SubscriptionStatus.ACTIVE,
    paused: SubscriptionStatus.PAUSED,
    past_due: SubscriptionStatus.PAST_DUE,
    unpaid: SubscriptionStatus.PAST_DUE,
    cancelled: SubscriptionStatus.CANCELED,
    expired: SubscriptionStatus.EXPIRED,
  };
  return m[s] ?? SubscriptionStatus.INCOMPLETE;
}

function readCustom(
  payload: Record<string, unknown>,
): { tenantId?: string; externalUserId?: string } {
  const meta = payload.meta as
    | { custom_data?: Record<string, string | undefined> }
    | undefined;
  const c = meta?.custom_data;
  if (c) {
    return {
      tenantId: c.tenant_id ?? c.tenantId,
      externalUserId: c.external_user_id ?? c.externalUserId,
    };
  }
  const data = payload.data as
    | {
        attributes?: {
          first_order_item?: { custom?: Record<string, string> };
          user_email?: string;
        };
      }
    | undefined;
  const custom = data?.attributes?.first_order_item?.custom;
  if (custom) {
    return {
      tenantId: custom.tenant_id,
      externalUserId: custom.external_user_id,
    };
  }
  return {};
}

@Injectable()
export class LemonWebhookService {
  private readonly log = new Logger(LemonWebhookService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: BillingProviderRegistry,
  ) {}

  async processEvent(
    providerAccountId: string,
    parsed: { eventName: string; externalEventId: string | null; payload: Record<string, unknown> },
  ): Promise<{ status: string }> {
    const account = await this.prisma.billingProviderAccount.findUnique({
      where: { id: providerAccountId },
    });
    if (!account || account.provider !== BillingProvider.LEMON_SQUEEZY) {
      return { status: 'ignored' };
    }
    const tenantId = account.tenantId;

    if (parsed.externalEventId) {
      const dup = await this.prisma.providerEventLog.findFirst({
        where: {
          provider: BillingProvider.LEMON_SQUEEZY,
          externalEventId: parsed.externalEventId,
        },
      });
      if (dup?.processedAt) {
        return { status: 'duplicate' };
      }
    }

    const logRow = await this.prisma.providerEventLog.create({
      data: {
        tenantId,
        providerAccountId,
        provider: BillingProvider.LEMON_SQUEEZY,
        eventType: parsed.eventName,
        externalEventId: parsed.externalEventId,
        status: 'received',
        payload: parsed.payload as object,
      },
    });

    try {
      if (
        parsed.eventName.startsWith('subscription_') ||
        parsed.eventName === 'order_created'
      ) {
        await this.handleRelevantEvent(providerAccountId, tenantId, parsed);
      }
      await this.prisma.providerEventLog.update({
        where: { id: logRow.id },
        data: { processedAt: new Date(), status: 'processed' },
      });
      return { status: 'ok' };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.log.warn(`Webhook process error: ${msg}`);
      await this.prisma.providerEventLog.update({
        where: { id: logRow.id },
        data: { status: 'error', errorMessage: msg },
      });
      throw e;
    }
  }

  private async handleRelevantEvent(
    providerAccountId: string,
    tenantId: string,
    parsed: { eventName: string; payload: Record<string, unknown> },
  ): Promise<void> {
    const custom = readCustom(parsed.payload);
    let externalSubscriptionId = this.extractSubscriptionId(parsed.payload);
    if (!externalSubscriptionId && parsed.eventName === 'order_created') {
      const data = parsed.payload.data as
        | { attributes?: { subscription_id?: string | number } }
        | undefined;
      if (data?.attributes?.subscription_id != null) {
        externalSubscriptionId = String(data.attributes.subscription_id);
      }
    }
    if (!externalSubscriptionId) {
      this.log.debug('No subscription id in webhook payload');
      return;
    }
    await this.syncSubscription(
      providerAccountId,
      tenantId,
      externalSubscriptionId,
      custom,
    );
  }

  private extractSubscriptionId(payload: Record<string, unknown>): string | null {
    const data = payload.data as { id?: string; type?: string } | undefined;
    if (data?.type === 'subscriptions' && data.id) {
      return data.id;
    }
    const included = payload.included as Array<{ type: string; id: string }> | undefined;
    const sub = included?.find((x) => x.type === 'subscriptions');
    return sub?.id ?? null;
  }

  private async syncSubscription(
    providerAccountId: string,
    tenantId: string,
    externalSubscriptionId: string,
    custom: { tenantId?: string; externalUserId?: string },
  ): Promise<void> {
    const adapter = this.registry.get(BillingProvider.LEMON_SQUEEZY);
    const remote = await adapter.fetchSubscription({
      providerAccountId,
      externalSubscriptionId,
    });
    const variantId = remote.variantId ?? this.extractVariantId(remote.raw);
    if (!variantId) {
      this.log.warn('No variant id for subscription ' + externalSubscriptionId);
      return;
    }
    const price = await this.prisma.planPrice.findFirst({
      where: {
        tenantId,
        providerAccountId,
        externalVariantId: variantId,
      },
      include: { plan: true },
    });
    if (!price) {
      this.log.warn(`No PlanPrice for variant ${variantId}`);
      return;
    }

    let externalUserId = custom.externalUserId;
    const resolvedTenantId = custom.tenantId ?? tenantId;
    if (resolvedTenantId !== tenantId) {
      this.log.warn('Custom tenant_id mismatch webhook');
    }

    if (!externalUserId) {
      const email = this.extractEmail(remote.raw);
      if (email) {
        const u = await this.prisma.externalUser.findFirst({
          where: { tenantId, email },
        });
        externalUserId = u?.externalUserId;
      }
    }
    if (!externalUserId) {
      this.log.warn('Could not resolve external user for subscription');
      return;
    }

    const user = await this.prisma.externalUser.findUnique({
      where: {
        tenantId_externalUserId: {
          tenantId,
          externalUserId,
        },
      },
    });
    if (!user) {
      this.log.warn(`External user ${externalUserId} not registered`);
      return;
    }

    const status = mapLemonStatus(remote.status);

    await this.prisma.subscription.upsert({
      where: {
        provider_externalSubscriptionId: {
          provider: BillingProvider.LEMON_SQUEEZY,
          externalSubscriptionId,
        },
      },
      create: {
        tenantId,
        externalUserIdRef: user.id,
        planId: price.planId,
        planPriceId: price.id,
        providerAccountId,
        provider: BillingProvider.LEMON_SQUEEZY,
        externalSubscriptionId,
        status,
        cancelAtPeriodEnd: remote.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: remote.currentPeriodEnd,
        activatedAt: status === SubscriptionStatus.ACTIVE ? new Date() : undefined,
        lastProviderSyncAt: new Date(),
      },
      update: {
        planId: price.planId,
        planPriceId: price.id,
        status,
        cancelAtPeriodEnd: remote.cancelAtPeriodEnd ?? false,
        currentPeriodEnd: remote.currentPeriodEnd,
        lastProviderSyncAt: new Date(),
      },
    });
  }

  private extractVariantId(raw: Record<string, unknown> | undefined): string | null {
    if (!raw) return null;
    const data = raw.data as { attributes?: { variant_id?: number } } | undefined;
    const v = data?.attributes?.variant_id;
    return v != null ? String(v) : null;
  }

  private extractEmail(raw: Record<string, unknown> | undefined): string | null {
    if (!raw) return null;
    const data = raw.data as {
      attributes?: { user_email?: string; customer_email?: string };
    };
    return data?.attributes?.user_email ?? data?.attributes?.customer_email ?? null;
  }
}
