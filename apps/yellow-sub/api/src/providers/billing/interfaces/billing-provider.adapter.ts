import { BillingProvider } from '@prisma/client';

export type CreateOrGetCustomerInput = {
  provider: BillingProvider;
  providerAccountId: string;
  email: string;
  /** Internal `ExternalUser.id` (cuid) */
  externalUserRecordId: string;
  name?: string;
};

export type ProviderCustomerResult = {
  externalCustomerId: string;
};

export type CreateCheckoutSessionInput = {
  providerAccountId: string;
  variantId: string;
  email: string;
  successUrl: string;
  cancelUrl: string;
  /** Passed to Lemon `checkout_data.custom` (string values). */
  customData?: Record<string, string>;
};

export type CreateCheckoutSessionResult = {
  checkoutUrl: string;
  externalCheckoutId?: string;
};

export type CreateManagementUrlInput = {
  providerAccountId: string;
  externalSubscriptionId: string;
};

export type CreateManagementUrlResult = {
  url: string;
};

export type CancelSubscriptionInput = {
  providerAccountId: string;
  externalSubscriptionId: string;
};

export type CancelSubscriptionResult = {
  status: string;
};

export type ChangeSubscriptionInput = {
  providerAccountId: string;
  externalSubscriptionId: string;
  newVariantId: string;
};

export type ChangeSubscriptionResult = {
  status: string;
  manageUrl?: string;
};

export type FetchSubscriptionInput = {
  providerAccountId: string;
  externalSubscriptionId: string;
};

export type FetchSubscriptionResult = {
  status: string;
  cancelAtPeriodEnd?: boolean;
  currentPeriodEnd?: Date;
  /** Lemon variant id as string */
  variantId?: string;
  raw?: Record<string, unknown>;
};

export type VerifyWebhookInput = {
  providerAccountId: string;
  rawBody: Buffer;
  signatureHeader: string | undefined;
};

export type VerifyWebhookResult = { valid: boolean };

export type ParseWebhookInput = {
  rawBody: Buffer;
};

export type ParsedWebhookEvent = {
  eventName: string;
  externalEventId: string | null;
  payload: Record<string, unknown>;
};

export interface BillingProviderAdapter {
  readonly provider: BillingProvider;

  createOrGetCustomer(input: CreateOrGetCustomerInput): Promise<ProviderCustomerResult>;

  createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult>;

  createManagementUrl(input: CreateManagementUrlInput): Promise<CreateManagementUrlResult>;

  cancelSubscription(input: CancelSubscriptionInput): Promise<CancelSubscriptionResult>;

  changeSubscription(input: ChangeSubscriptionInput): Promise<ChangeSubscriptionResult>;

  fetchSubscription(input: FetchSubscriptionInput): Promise<FetchSubscriptionResult>;

  verifyWebhookSignature(input: VerifyWebhookInput): Promise<VerifyWebhookResult>;

  parseWebhookEvent(input: ParseWebhookInput): Promise<ParsedWebhookEvent>;
}
