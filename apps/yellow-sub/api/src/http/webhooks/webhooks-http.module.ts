import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { WebhooksModule } from '../../webhooks/webhooks.module';
import { BillingModule } from '../../providers/billing/billing.module';

@Module({
  imports: [WebhooksModule, BillingModule],
  controllers: [WebhooksController],
})
export class WebhooksHttpModule {}
