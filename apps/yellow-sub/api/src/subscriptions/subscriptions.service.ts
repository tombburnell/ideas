import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ActionType, SubscriptionStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BillingProviderRegistry } from '../providers/billing/billing-provider.registry';
import { EntitlementsService } from '../entitlements/entitlements.service';

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly registry: BillingProviderRegistry,
    private readonly entitlements: EntitlementsService,
  ) {}

  async ensureProviderCustomer(
    tenantId: string,
    externalUserRecordId: string,
    providerAccountId: string,
  ) {
    const user = await this.prisma.externalUser.findFirstOrThrow({
      where: { id: externalUserRecordId, tenantId },
    });
    const account = await this.prisma.billingProviderAccount.findFirstOrThrow({
      where: { id: providerAccountId, tenantId },
    });
    const adapter = this.registry.get(account.provider);
    const result = await adapter.createOrGetCustomer({
      provider: account.provider,
      providerAccountId: account.id,
      email: user.email ?? `${user.externalUserId}@placeholder.invalid`,
      externalUserRecordId: user.id,
      name: user.displayName ?? undefined,
    });
    await this.prisma.providerCustomer.upsert({
      where: {
        externalUserIdRef_providerAccountId: {
          externalUserIdRef: user.id,
          providerAccountId: account.id,
        },
      },
      create: {
        tenantId,
        externalUserIdRef: user.id,
        providerAccountId: account.id,
        provider: account.provider,
        externalCustomerId: result.externalCustomerId,
        email: user.email,
      },
      update: {
        email: user.email,
      },
    });
    return result;
  }

  async createCheckout(
    tenantId: string,
    externalUserId: string,
    body: {
      planPriceId?: string;
      planKey?: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    const user = await this.prisma.externalUser.findUnique({
      where: {
        tenantId_externalUserId: { tenantId, externalUserId },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found; call register-or-sync first');
    }
    let price = body.planPriceId
      ? await this.prisma.planPrice.findFirst({
          where: { id: body.planPriceId, tenantId, active: true },
          include: { plan: true, providerAccount: true },
        })
      : null;
    if (!price && body.planKey) {
      price = await this.prisma.planPrice.findFirst({
        where: {
          tenantId,
          active: true,
          plan: { key: body.planKey },
        },
        include: { plan: true, providerAccount: true },
      });
    }
    if (!price || !price.externalVariantId) {
      throw new BadRequestException('Plan price or variant not found');
    }
    await this.ensureProviderCustomer(tenantId, user.id, price.providerAccountId);
    const adapter = this.registry.get(price.provider);
    const u = await this.prisma.externalUser.findUniqueOrThrow({
      where: { id: user.id },
    });
    const session = await adapter.createCheckoutSession({
      providerAccountId: price.providerAccountId,
      variantId: price.externalVariantId,
      email: u.email ?? `${u.externalUserId}@placeholder.invalid`,
      successUrl: body.successUrl,
      cancelUrl: body.cancelUrl,
      customData: {
        tenant_id: tenantId,
        external_user_id: u.externalUserId,
      },
    });
    await this.entitlements.logAction(tenantId, ActionType.CHECKOUT_CREATED, 'ok', {
      externalUserIdRef: user.id,
      actorType: 'api',
      request: body as object,
      response: session as object,
    });
    return { checkoutUrl: session.checkoutUrl, externalCheckoutId: session.externalCheckoutId };
  }

  async getManagementUrl(tenantId: string, externalUserId: string) {
    const user = await this.prisma.externalUser.findUnique({
      where: { tenantId_externalUserId: { tenantId, externalUserId } },
    });
    if (!user) throw new NotFoundException('User not found');
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        externalUserIdRef: user.id,
        status: {
          in: [
            SubscriptionStatus.ACTIVE,
            SubscriptionStatus.TRIALING,
            SubscriptionStatus.PAST_DUE,
          ],
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
    if (!sub) {
      throw new BadRequestException('No active subscription');
    }
    const adapter = this.registry.get(sub.provider);
    const result = await adapter.createManagementUrl({
      providerAccountId: sub.providerAccountId,
      externalSubscriptionId: sub.externalSubscriptionId,
    });
    await this.entitlements.logAction(
      tenantId,
      ActionType.PORTAL_URL_CREATED,
      'ok',
      {
        subscriptionId: sub.id,
        externalUserIdRef: user.id,
        actorType: 'api',
        response: result as object,
      },
    );
    return { url: result.url };
  }

  async cancel(
    tenantId: string,
    externalUserId: string,
    body: { immediate?: boolean },
  ) {
    const user = await this.prisma.externalUser.findUnique({
      where: { tenantId_externalUserId: { tenantId, externalUserId } },
    });
    if (!user) throw new NotFoundException('User not found');
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        externalUserIdRef: user.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!sub) throw new BadRequestException('No active subscription');
    const adapter = this.registry.get(sub.provider);
    await adapter.cancelSubscription({
      providerAccountId: sub.providerAccountId,
      externalSubscriptionId: sub.externalSubscriptionId,
    });
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        cancelAtPeriodEnd: !body.immediate,
        canceledAt: new Date(),
        status: body.immediate ? SubscriptionStatus.CANCELED : sub.status,
      },
    });
    await this.entitlements.logAction(tenantId, ActionType.CANCEL_REQUESTED, 'ok', {
      subscriptionId: sub.id,
      externalUserIdRef: user.id,
      actorType: 'api',
      request: body as object,
    });
    return { ok: true };
  }

  async changePlan(
    tenantId: string,
    externalUserId: string,
    body: { planPriceId: string },
  ) {
    const user = await this.prisma.externalUser.findUnique({
      where: { tenantId_externalUserId: { tenantId, externalUserId } },
    });
    if (!user) throw new NotFoundException('User not found');
    const sub = await this.prisma.subscription.findFirst({
      where: {
        tenantId,
        externalUserIdRef: user.id,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!sub) throw new BadRequestException('No active subscription');
    const newPrice = await this.prisma.planPrice.findFirst({
      where: { id: body.planPriceId, tenantId, active: true },
    });
    if (!newPrice?.externalVariantId) {
      throw new BadRequestException('Invalid plan price');
    }
    if (newPrice.provider !== sub.provider) {
      throw new BadRequestException('Cannot change provider in v1');
    }
    const adapter = this.registry.get(sub.provider);
    const result = await adapter.changeSubscription({
      providerAccountId: sub.providerAccountId,
      externalSubscriptionId: sub.externalSubscriptionId,
      newVariantId: newPrice.externalVariantId,
    });
    await this.prisma.subscription.update({
      where: { id: sub.id },
      data: {
        planId: newPrice.planId,
        planPriceId: newPrice.id,
        lastProviderSyncAt: new Date(),
      },
    });
    await this.entitlements.logAction(tenantId, ActionType.UPGRADE_REQUESTED, 'ok', {
      subscriptionId: sub.id,
      externalUserIdRef: user.id,
      actorType: 'api',
      request: body as object,
      response: result as object,
    });
    return { ok: true, status: result.status, manageUrl: result.manageUrl };
  }
}
