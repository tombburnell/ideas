import { Injectable } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import type { BillingProviderAdapter } from '../interfaces/billing-provider.adapter';

/** Placeholder — implement PayPal when needed. */
@Injectable()
export class PaypalBillingAdapter implements BillingProviderAdapter {
  readonly provider = BillingProvider.PAYPAL;

  async createOrGetCustomer(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async createCheckoutSession(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async createManagementUrl(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async cancelSubscription(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async changeSubscription(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async fetchSubscription(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
  async verifyWebhookSignature(): Promise<{ valid: boolean }> {
    throw new Error('PayPal adapter not implemented');
  }
  async parseWebhookEvent(): Promise<never> {
    throw new Error('PayPal adapter not implemented');
  }
}
