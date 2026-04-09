import { Module } from '@nestjs/common';
import { LemonWebhookService } from './lemon-webhook.service';
import { BillingModule } from '../providers/billing/billing.module';

@Module({
  imports: [BillingModule],
  providers: [LemonWebhookService],
  exports: [LemonWebhookService],
})
export class WebhooksModule {}
