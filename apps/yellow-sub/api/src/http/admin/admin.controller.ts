import {
  BadRequestException,
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
import { BillingProvider, FeatureType, ConfigType, PlanStatus, QuotaPeriod, TierMode } from '@prisma/client';
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

  @Get('tenants/:tenantId/product-families')
  listProductFamilies(@Param('tenantId') tenantId: string) {
    return this.prisma.productFamily.findMany({
      where: { tenantId },
      orderBy: { sortOrder: 'asc' },
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

  @Put('product-families/:id')
  updateProductFamily(
    @Param('id') id: string,
    @Body() body: { name?: string; description?: string; active?: boolean },
  ) {
    return this.prisma.productFamily.update({ where: { id }, data: body });
  }

  @Delete('product-families/:id')
  async deleteProductFamily(@Param('id') id: string) {
    const plans = await this.prisma.plan.count({ where: { productFamilyId: id } });
    if (plans > 0) {
      throw new BadRequestException(`Cannot delete: ${plans} plan(s) still reference this product family`);
    }
    return this.prisma.productFamily.delete({ where: { id } });
  }

  @Get('tenants/:tenantId/plans')
  listPlans(@Param('tenantId') tenantId: string) {
    return this.prisma.plan.findMany({
      where: { tenantId },
      include: { productFamily: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  @Get('plans/:planId')
  getPlan(@Param('planId') planId: string) {
    return this.prisma.plan.findUniqueOrThrow({
      where: { id: planId },
      include: {
        productFamily: true,
        prices: { include: { providerAccount: true } },
        features: { include: { feature: true, tiers: true } },
      },
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

  @Put('plans/:planId')
  updatePlan(
    @Param('planId') planId: string,
    @Body() body: { name?: string; description?: string; status?: PlanStatus; active?: boolean },
  ) {
    return this.prisma.plan.update({ where: { id: planId }, data: body });
  }

  @Delete('plans/:planId')
  async deletePlan(@Param('planId') planId: string) {
    const subs = await this.prisma.subscription.count({ where: { planId } });
    if (subs > 0) {
      throw new BadRequestException(`Cannot delete: ${subs} subscription(s) still reference this plan`);
    }
    await this.prisma.planFeature.deleteMany({ where: { planId } });
    await this.prisma.planPrice.deleteMany({ where: { planId } });
    await this.prisma.planTag.deleteMany({ where: { planId } });
    return this.prisma.plan.delete({ where: { id: planId } });
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
      externalVariantId?: string;
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
        externalVariantId: body.externalVariantId ?? undefined,
        currency: body.currency,
        unitAmountMinor: body.unitAmountMinor,
        billingInterval: body.billingInterval,
        name: body.name,
      },
    });
  }

  @Put('plan-prices/:planPriceId')
  updatePlanPrice(
    @Param('planPriceId') planPriceId: string,
    @Body()
    body: {
      providerAccountId?: string;
      provider?: BillingProvider;
      externalPriceId?: string;
      externalVariantId?: string | null;
      currency?: string;
      unitAmountMinor?: number;
      billingInterval?: string;
      name?: string | null;
    },
  ) {
    return this.prisma.planPrice.update({
      where: { id: planPriceId },
      data: {
        ...(body.providerAccountId !== undefined && { providerAccountId: body.providerAccountId }),
        ...(body.provider !== undefined && { provider: body.provider }),
        ...(body.externalPriceId !== undefined && { externalPriceId: body.externalPriceId }),
        ...(body.externalVariantId !== undefined && { externalVariantId: body.externalVariantId }),
        ...(body.currency !== undefined && { currency: body.currency }),
        ...(body.unitAmountMinor !== undefined && { unitAmountMinor: body.unitAmountMinor }),
        ...(body.billingInterval !== undefined && { billingInterval: body.billingInterval }),
        ...(body.name !== undefined && { name: body.name }),
      },
    });
  }

  @Get('tenants/:tenantId/features')
  listFeatures(
    @Param('tenantId') tenantId: string,
    @Query('productFamilyId') productFamilyId?: string,
  ) {
    return this.prisma.feature.findMany({
      where: {
        tenantId,
        ...(productFamilyId ? { productFamilyId } : {}),
      },
      include: { productFamily: { select: { id: true, key: true, name: true } } },
      orderBy: { name: 'asc' },
    });
  }

  @Post('tenants/:tenantId/features')
  async createFeature(
    @Param('tenantId') tenantId: string,
    @Body() body: {
      productFamilyId: string;
      key: string;
      name: string;
      description?: string;
      type?: FeatureType;
      unitLabel?: string;
      configType?: ConfigType;
      configOptions?: string[];
    },
  ) {
    const family = await this.prisma.productFamily.findFirst({
      where: { id: body.productFamilyId, tenantId },
    });
    if (!family) {
      throw new BadRequestException('productFamilyId must belong to this tenant');
    }
    return this.prisma.feature.create({
      data: {
        tenantId,
        productFamilyId: body.productFamilyId,
        key: body.key,
        name: body.name,
        description: body.description,
        type: body.type ?? FeatureType.BOOLEAN,
        unitLabel: body.unitLabel,
        configType: body.configType,
        configOptions: body.configOptions,
      },
      include: { productFamily: { select: { id: true, key: true, name: true } } },
    });
  }

  @Put('features/:featureId')
  updateFeature(
    @Param('featureId') featureId: string,
    @Body() body: {
      name?: string;
      description?: string;
      active?: boolean;
      type?: FeatureType;
      unitLabel?: string;
      configType?: ConfigType;
      configOptions?: string[];
    },
  ) {
    return this.prisma.feature.update({
      where: { id: featureId },
      data: body,
      include: { productFamily: { select: { id: true, key: true, name: true } } },
    });
  }

  @Delete('features/:featureId')
  async deleteFeature(@Param('featureId') featureId: string) {
    const linked = await this.prisma.planFeature.count({ where: { featureId } });
    if (linked > 0) {
      throw new BadRequestException(`Cannot delete: feature is linked to ${linked} plan(s)`);
    }
    return this.prisma.feature.delete({ where: { id: featureId } });
  }

  @Post('tenants/:tenantId/plans/:planId/plan-features')
  async linkPlanFeature(
    @Param('tenantId') tenantId: string,
    @Param('planId') planId: string,
    @Body() body: {
      featureId: string;
      includedAmount?: number;
      softLimit?: number;
      hardLimit?: number;
      limitPeriod?: QuotaPeriod;
      tierMode?: TierMode;
      configValue?: string;
    },
  ) {
    const plan = await this.prisma.plan.findFirst({
      where: { id: planId, tenantId },
      select: { productFamilyId: true },
    });
    if (!plan) throw new BadRequestException('Plan not found');
    const feature = await this.prisma.feature.findFirst({
      where: { id: body.featureId, tenantId },
      select: { productFamilyId: true },
    });
    if (!feature) throw new BadRequestException('Feature not found');
    if (feature.productFamilyId !== plan.productFamilyId) {
      throw new BadRequestException(
        'Feature belongs to a different product family than this plan',
      );
    }
    return this.prisma.planFeature.create({
      data: {
        planId,
        featureId: body.featureId,
        includedAmount: body.includedAmount,
        softLimit: body.softLimit,
        hardLimit: body.hardLimit,
        limitPeriod: body.limitPeriod,
        tierMode: body.tierMode,
        configValue: body.configValue,
      },
      include: { feature: true, tiers: true },
    });
  }

  @Put('plan-features/:planFeatureId')
  updatePlanFeature(
    @Param('planFeatureId') planFeatureId: string,
    @Body() body: {
      includedAmount?: number | null;
      softLimit?: number | null;
      hardLimit?: number | null;
      limitPeriod?: QuotaPeriod | null;
      tierMode?: TierMode | null;
      configValue?: string | null;
    },
  ) {
    return this.prisma.planFeature.update({
      where: { id: planFeatureId },
      data: body,
      include: { feature: true, tiers: true },
    });
  }

  @Delete('plan-features/:planFeatureId')
  unlinkPlanFeature(@Param('planFeatureId') planFeatureId: string) {
    return this.prisma.planFeature.delete({ where: { id: planFeatureId } });
  }

  @Post('plan-features/:planFeatureId/tiers')
  async upsertTiers(
    @Param('planFeatureId') planFeatureId: string,
    @Body() body: { tiers: { fromUnit: number; toUnit?: number | null; unitPriceMinor: number; flatFeeMinor?: number; currency: string }[] },
  ) {
    await this.prisma.meteringTier.deleteMany({ where: { planFeatureId } });
    const created = await Promise.all(
      body.tiers.map((t) =>
        this.prisma.meteringTier.create({
          data: {
            planFeatureId,
            fromUnit: t.fromUnit,
            toUnit: t.toUnit ?? null,
            unitPriceMinor: t.unitPriceMinor,
            flatFeeMinor: t.flatFeeMinor ?? 0,
            currency: t.currency,
          },
        }),
      ),
    );
    return created;
  }

  @Delete('plan-features/:planFeatureId/tiers/:tierId')
  deleteTier(@Param('tierId') tierId: string) {
    return this.prisma.meteringTier.delete({ where: { id: tierId } });
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
