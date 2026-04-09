import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { BillingProvider, PlanStatus } from '@prisma/client';
import { AdminFirebaseGuard } from '../../auth/guards/admin-firebase.guard';
import { CredentialsCryptoService } from '../../common/crypto/credentials-crypto.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyService } from '../../auth/api-key.service';
import type { Request } from 'express';

@ApiTags('admin')
@Controller('api/v1/admin')
@UseGuards(AdminFirebaseGuard)
@ApiBearerAuth()
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
    private readonly apiKeys: ApiKeyService,
  ) {}

  @Get('me')
  me(@Req() req: Request & { adminEmail?: string; adminScopes?: unknown[] }) {
    return { email: req.adminEmail, scopes: req.adminScopes };
  }

  @Get('customers')
  listCustomers() {
    return this.prisma.customer.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('customers')
  createCustomer(@Body() body: { name: string; slug: string }) {
    return this.prisma.customer.create({ data: body });
  }

  @Put('customers/:id')
  updateCustomer(
    @Param('id') id: string,
    @Body() body: { name?: string; active?: boolean },
  ) {
    return this.prisma.customer.update({ where: { id }, data: body });
  }

  @Get('brands')
  listBrands(@Query('customerId') customerId?: string) {
    return this.prisma.brand.findMany({
      where: customerId ? { customerId } : undefined,
    });
  }

  @Post('brands')
  createBrand(
    @Body() body: { customerId: string; name: string; slug: string },
  ) {
    return this.prisma.brand.create({ data: body });
  }

  @Get('tenants')
  listTenants(@Query('customerId') customerId?: string) {
    return this.prisma.tenant.findMany({
      where: customerId ? { customerId } : undefined,
      include: { customer: true, brand: true },
    });
  }

  @Post('tenants')
  createTenant(
    @Body()
    body: {
      customerId: string;
      brandId?: string;
      name: string;
      slug: string;
      defaultCurrency: string;
      publicAppName?: string;
    },
  ) {
    return this.prisma.tenant.create({ data: body });
  }

  @Post('tenants/:tenantId/api-keys')
  async createApiKey(
    @Param('tenantId') tenantId: string,
    @Body() body: { name: string },
  ) {
    const raw = this.apiKeys.generateRawKey();
    const keyHash = await this.apiKeys.hashKey(raw);
    const prefix = this.apiKeys.keyPrefix(raw);
    await this.prisma.tenantApiKey.create({
      data: {
        tenantId,
        name: body.name,
        keyHash,
        keyPrefix: prefix,
      },
    });
    return { apiKey: raw, keyPrefix: prefix, warning: 'Store this key; it will not be shown again.' };
  }

  @Get('tenants/:tenantId/api-keys')
  listApiKeys(@Param('tenantId') tenantId: string) {
    return this.prisma.tenantApiKey.findMany({
      where: { tenantId },
      select: { id: true, name: true, keyPrefix: true, active: true, lastUsedAt: true, createdAt: true },
    });
  }

  @Post('tenants/:tenantId/provider-accounts')
  createProviderAccount(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      provider: BillingProvider;
      displayName: string;
      accountRef: string;
      credentials: Record<string, unknown>;
      webhookSecret?: string;
    },
  ) {
    const credEnc = this.crypto.encryptJson(body.credentials);
    const whEnc = body.webhookSecret
      ? this.crypto.encryptJson({ secret: body.webhookSecret })
      : undefined;
    return this.prisma.billingProviderAccount.create({
      data: {
        tenantId,
        provider: body.provider,
        displayName: body.displayName,
        accountRef: body.accountRef,
        credentialsEncrypted: credEnc,
        webhookSecretEncrypted: whEnc,
      },
    });
  }

  @Get('tenants/:tenantId/provider-accounts')
  listProviderAccounts(@Param('tenantId') tenantId: string) {
    return this.prisma.billingProviderAccount.findMany({
      where: { tenantId },
      select: {
        id: true,
        provider: true,
        displayName: true,
        accountRef: true,
        active: true,
        isDefault: true,
        createdAt: true,
      },
    });
  }

  @Post('tenants/:tenantId/product-families')
  createProductFamily(
    @Param('tenantId') tenantId: string,
    @Body() body: { key: string; name: string; description?: string },
  ) {
    return this.prisma.productFamily.create({
      data: { tenantId, ...body },
    });
  }

  @Post('tenants/:tenantId/plans')
  createPlan(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      productFamilyId: string;
      key: string;
      name: string;
      description?: string;
      status?: PlanStatus;
    },
  ) {
    return this.prisma.plan.create({
      data: {
        tenantId,
        productFamilyId: body.productFamilyId,
        key: body.key,
        name: body.name,
        description: body.description,
        status: body.status ?? PlanStatus.DRAFT,
      },
    });
  }

  @Post('tenants/:tenantId/plan-prices')
  createPlanPrice(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      planId: string;
      providerAccountId: string;
      provider: BillingProvider;
      externalPriceId: string;
      externalVariantId: string;
      currency: string;
      unitAmountMinor: number;
      billingInterval: string;
      name?: string;
    },
  ) {
    return this.prisma.planPrice.create({
      data: {
        tenantId,
        planId: body.planId,
        providerAccountId: body.providerAccountId,
        provider: body.provider,
        externalPriceId: body.externalPriceId,
        externalVariantId: body.externalVariantId,
        currency: body.currency,
        unitAmountMinor: body.unitAmountMinor,
        billingInterval: body.billingInterval,
        name: body.name,
      },
    });
  }

  @Post('tenants/:tenantId/features')
  createFeature(
    @Param('tenantId') tenantId: string,
    @Body() body: { key: string; name: string; description?: string },
  ) {
    return this.prisma.feature.create({ data: { tenantId, ...body } });
  }

  @Post('tenants/:tenantId/plans/:planId/plan-features')
  linkPlanFeature(
    @Param('planId') planId: string,
    @Body() body: { featureId: string; enabled?: boolean },
  ) {
    return this.prisma.planFeature.create({
      data: {
        planId,
        featureId: body.featureId,
        enabled: body.enabled ?? true,
      },
    });
  }

  @Get('tenants/:tenantId/users')
  listUsers(
    @Param('tenantId') tenantId: string,
    @Query('q') q?: string,
  ) {
    return this.prisma.externalUser.findMany({
      where: {
        tenantId,
        OR: q
          ? [
              { email: { contains: q, mode: 'insensitive' } },
              { externalUserId: { contains: q } },
            ]
          : undefined,
      },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get('tenants/:tenantId/subscriptions')
  listSubs(@Param('tenantId') tenantId: string) {
    return this.prisma.subscription.findMany({
      where: { tenantId },
      include: { plan: true, externalUser: true },
      take: 100,
      orderBy: { updatedAt: 'desc' },
    });
  }

  @Get('tenants/:tenantId/events')
  listEvents(@Param('tenantId') tenantId: string) {
    return this.prisma.providerEventLog.findMany({
      where: { tenantId },
      take: 100,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('subscriptions/:subscriptionId/resync')
  async resync(@Param('subscriptionId') subscriptionId: string) {
    const sub = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    return { queued: true, subscriptionId: sub?.id };
  }

  @Post('tenants/:tenantId/manual-overrides')
  createOverride(
    @Param('tenantId') tenantId: string,
    @Body()
    body: {
      externalUserIdRef: string;
      subscriptionId?: string;
      featureKey?: string;
      quotaKey?: string;
      enabled?: boolean;
      quotaOverride?: number;
      reason?: string;
    },
  ) {
    return this.prisma.manualEntitlementOverride.create({
      data: {
        tenantId,
        externalUserIdRef: body.externalUserIdRef,
        subscriptionId: body.subscriptionId,
        featureKey: body.featureKey,
        quotaKey: body.quotaKey,
        enabled: body.enabled,
        quotaOverride: body.quotaOverride,
        reason: body.reason,
      },
    });
  }

  @Delete('provider-events/:id/retry')
  retryEvent() {
    return { message: 'Replay not implemented in v1; re-send from provider dashboard' };
  }
}
