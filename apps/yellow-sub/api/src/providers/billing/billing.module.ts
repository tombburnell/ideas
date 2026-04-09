import { Module } from '@nestjs/common';
import { LemonBillingAdapter } from './lemon/lemon.adapter';
import { StripeBillingAdapter } from './stripe/stripe.adapter';
import { PaypalBillingAdapter } from './paypal/paypal.adapter';
import { BillingProviderRegistry } from './billing-provider.registry';

@Module({
  providers: [LemonBillingAdapter, StripeBillingAdapter, PaypalBillingAdapter, BillingProviderRegistry],
  exports: [BillingProviderRegistry, LemonBillingAdapter],
})
export class BillingModule {}
