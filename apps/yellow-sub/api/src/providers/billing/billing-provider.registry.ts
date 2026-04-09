import { Injectable } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import type { BillingProviderAdapter } from './interfaces/billing-provider.adapter';
import { LemonBillingAdapter } from './lemon/lemon.adapter';
import { StripeBillingAdapter } from './stripe/stripe.adapter';
import { PaypalBillingAdapter } from './paypal/paypal.adapter';

@Injectable()
export class BillingProviderRegistry {
  constructor(
    private readonly lemon: LemonBillingAdapter,
    private readonly stripe: StripeBillingAdapter,
    private readonly paypal: PaypalBillingAdapter,
  ) {}

  get(provider: BillingProvider): BillingProviderAdapter {
    switch (provider) {
      case BillingProvider.LEMON_SQUEEZY:
        return this.lemon;
      case BillingProvider.STRIPE:
        return this.stripe;
      case BillingProvider.PAYPAL:
        return this.paypal;
      default:
        throw new Error(`Unknown provider ${provider}`);
    }
  }
}
