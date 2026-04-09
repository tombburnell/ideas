import { Module } from '@nestjs/common';
import { SubscriptionsService } from './subscriptions.service';
import { BillingModule } from '../providers/billing/billing.module';
import { EntitlementsModule } from '../entitlements/entitlements.module';

@Module({
  imports: [BillingModule, EntitlementsModule],
  providers: [SubscriptionsService],
  exports: [SubscriptionsService],
})
export class SubscriptionsModule {}
