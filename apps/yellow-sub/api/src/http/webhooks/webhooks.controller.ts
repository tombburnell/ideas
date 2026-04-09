import {
  BadRequestException,
  Controller,
  Headers,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { BillingProvider } from '@prisma/client';
import { BillingProviderRegistry } from '../../providers/billing/billing-provider.registry';
import { LemonWebhookService } from '../../webhooks/lemon-webhook.service';

@ApiTags('webhooks')
@Controller('api/v1/webhooks')
export class WebhooksController {
  constructor(
    private readonly registry: BillingProviderRegistry,
    private readonly lemonWebhook: LemonWebhookService,
  ) {}

  @Post('lemon/:providerAccountId')
  async lemon(
    @Param('providerAccountId') providerAccountId: string,
    @Headers('x-signature') signature: string | undefined,
    @Req() req: Request & { rawBody?: Buffer },
  ) {
    const raw = req.rawBody;
    if (!raw?.length) {
      throw new BadRequestException('Raw body required');
    }
    const adapter = this.registry.get(BillingProvider.LEMON_SQUEEZY);
    const v = await adapter.verifyWebhookSignature({
      providerAccountId,
      rawBody: raw,
      signatureHeader: signature,
    });
    if (!v.valid) {
      throw new BadRequestException('Invalid signature');
    }
    const parsed = await adapter.parseWebhookEvent({ rawBody: raw });
    return this.lemonWebhook.processEvent(providerAccountId, parsed);
  }
}
