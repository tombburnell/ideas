import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { PublicApiKeyGuard } from '../../auth/guards/public-api-key.guard';
import { CatalogService } from '../../catalog/catalog.service';
import { EntitlementsService } from '../../entitlements/entitlements.service';
import { SubscriptionsService } from '../../subscriptions/subscriptions.service';
import { UsersService } from '../../users/users.service';
import type { Request } from 'express';

@ApiTags('public')
@Controller('api/v1/public/tenants/:tenantSlug')
@UseGuards(PublicApiKeyGuard)
@ApiHeader({ name: 'X-Api-Key', required: true })
export class PublicController {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly users: UsersService,
    private readonly subs: SubscriptionsService,
    private readonly entitlements: EntitlementsService,
  ) {}

  private tenantId(req: Request & { tenantId?: string }): string {
    const id = req.tenantId;
    if (!id) throw new Error('tenant not resolved');
    return id;
  }

  @Get('catalog')
  async getCatalog(
    @Req() req: Request & { tenantId?: string },
    @Query('currency') currency?: string,
    @Query('region') region?: string,
    @Query('tags') tags?: string,
  ) {
    const tagList = tags?.split(',').map((t) => t.trim()).filter(Boolean);
    return this.catalogService.getCatalog(this.tenantId(req), {
      currency,
      region,
      tags: tagList,
    });
  }

  @Get('plans')
  async plans(
    @Req() req: Request & { tenantId?: string },
    @Query('currency') currency?: string,
    @Query('region') region?: string,
  ) {
    return this.catalogService.getPlans(this.tenantId(req), { currency, region });
  }

  @Get('plans/:planKey')
  async planDetail(
    @Req() req: Request & { tenantId?: string },
    @Param('planKey') planKey: string,
    @Query('currency') currency?: string,
  ) {
    return this.catalogService.getPlanByKey(this.tenantId(req), planKey, {
      currency,
    });
  }

  @Get('plan-comparison')
  async comparison(
    @Req() req: Request & { tenantId?: string },
    @Query('currency') currency?: string,
  ) {
    return this.catalogService.getPlanComparison(this.tenantId(req), { currency });
  }

  @Post('users/register-or-sync')
  async register(
    @Req() req: Request & { tenantId?: string },
    @Body()
    body: {
      externalUserId: string;
      email?: string;
      displayName?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.users.registerOrSync(this.tenantId(req), body);
  }

  @Get('users/:externalUserId/subscription')
  async userSub(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
  ) {
    const e = await this.entitlements.resolveForExternalUser(
      this.tenantId(req),
      externalUserId,
    );
    return { subscription: e.subscription, tenant: e.tenant, user: e.user };
  }

  @Get('users/:externalUserId/entitlements')
  async userEnt(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
  ) {
    let manageUrl: string | null = null;
    try {
      manageUrl = (await this.subs.getManagementUrl(
        this.tenantId(req),
        externalUserId,
      )).url;
    } catch {
      /* billing portal unavailable — proceed without manage link */
    }
    return this.entitlements.resolveForExternalUser(
      this.tenantId(req),
      externalUserId,
      manageUrl,
    );
  }

  @Get('users/:externalUserId/offers')
  async offers(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
  ) {
    const plans = await this.catalogService.getPlans(this.tenantId(req), {});
    return { externalUserId, plans };
  }

  @Post('users/:externalUserId/checkout')
  async checkout(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
    @Body()
    body: {
      planPriceId?: string;
      planKey?: string;
      successUrl: string;
      cancelUrl: string;
    },
  ) {
    return this.subs.createCheckout(this.tenantId(req), externalUserId, body);
  }

  @Post('users/:externalUserId/change-plan')
  async change(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
    @Body() body: { planPriceId: string },
  ) {
    return this.subs.changePlan(this.tenantId(req), externalUserId, body);
  }

  @Post('users/:externalUserId/cancel')
  async cancel(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
    @Body() body: { immediate?: boolean },
  ) {
    return this.subs.cancel(this.tenantId(req), externalUserId, body ?? {});
  }

  @Post('users/:externalUserId/management-url')
  async manage(
    @Req() req: Request & { tenantId?: string },
    @Param('externalUserId') externalUserId: string,
  ) {
    return this.subs.getManagementUrl(this.tenantId(req), externalUserId);
  }
}
