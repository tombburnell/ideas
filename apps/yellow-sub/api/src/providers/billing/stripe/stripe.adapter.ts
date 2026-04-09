import { Injectable } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import type { BillingProviderAdapter } from '../interfaces/billing-provider.adapter';

/** Placeholder — implement Stripe when credentials are wired. */
@Injectable()
export class StripeBillingAdapter implements BillingProviderAdapter {
  readonly provider = BillingProvider.STRIPE;

  async createOrGetCustomer(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async createCheckoutSession(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async createManagementUrl(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async cancelSubscription(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async changeSubscription(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async fetchSubscription(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
  async verifyWebhookSignature(): Promise<{ valid: boolean }> {
    throw new Error('Stripe adapter not implemented');
  }
  async parseWebhookEvent(): Promise<never> {
    throw new Error('Stripe adapter not implemented');
  }
}
