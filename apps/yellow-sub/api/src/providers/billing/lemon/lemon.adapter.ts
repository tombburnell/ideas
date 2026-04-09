import { Injectable } from '@nestjs/common';
import { BillingProvider } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { CredentialsCryptoService } from '../../../common/crypto/credentials-crypto.service';
import type {
  BillingProviderAdapter,
  CancelSubscriptionInput,
  CancelSubscriptionResult,
  ChangeSubscriptionInput,
  ChangeSubscriptionResult,
  CreateCheckoutSessionInput,
  CreateCheckoutSessionResult,
  CreateManagementUrlInput,
  CreateManagementUrlResult,
  CreateOrGetCustomerInput,
  FetchSubscriptionInput,
  FetchSubscriptionResult,
  ParseWebhookInput,
  ParsedWebhookEvent,
  ProviderCustomerResult,
  VerifyWebhookInput,
  VerifyWebhookResult,
} from '../interfaces/billing-provider.adapter';
import * as crypto from 'node:crypto';

type LemonCredentials = {
  apiKey: string;
  storeId: string;
};

const API_BASE = 'https://api.lemonsqueezy.com/v1';

@Injectable()
export class LemonBillingAdapter implements BillingProviderAdapter {
  readonly provider = BillingProvider.LEMON_SQUEEZY;

  constructor(
    private readonly prisma: PrismaService,
    private readonly crypto: CredentialsCryptoService,
  ) {}

  private async creds(providerAccountId: string): Promise<LemonCredentials> {
    const row = await this.prisma.billingProviderAccount.findUniqueOrThrow({
      where: { id: providerAccountId },
    });
    if (row.provider !== BillingProvider.LEMON_SQUEEZY) {
      throw new Error('Wrong provider for Lemon adapter');
    }
    return this.crypto.decryptJson<LemonCredentials>(row.credentialsEncrypted);
  }

  private async webhookSecret(providerAccountId: string): Promise<string | null> {
    const row = await this.prisma.billingProviderAccount.findUniqueOrThrow({
      where: { id: providerAccountId },
    });
    if (!row.webhookSecretEncrypted) return null;
    return this.crypto.decryptJson<{ secret: string }>(row.webhookSecretEncrypted).secret;
  }

  async createOrGetCustomer(input: CreateOrGetCustomerInput): Promise<ProviderCustomerResult> {
    const { apiKey, storeId } = await this.creds(input.providerAccountId);
    const existing = await this.prisma.providerCustomer.findFirst({
      where: {
        externalUserIdRef: input.externalUserRecordId,
        providerAccountId: input.providerAccountId,
      },
    });
    if (existing) {
      return { externalCustomerId: existing.externalCustomerId };
    }
    const res = await fetch(`${API_BASE}/customers`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'customers',
          attributes: {
            email: input.email,
            name: input.name ?? input.email,
          },
          relationships: {
            store: {
              data: { type: 'stores', id: storeId },
            },
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon create customer failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as { data: { id: string } };
    return { externalCustomerId: json.data.id };
  }

  async createCheckoutSession(input: CreateCheckoutSessionInput): Promise<CreateCheckoutSessionResult> {
    const { apiKey, storeId } = await this.creds(input.providerAccountId);
    const body = {
      data: {
        type: 'checkouts',
        attributes: {
          checkout_data: {
            email: input.email,
            custom: {
              tenant_id: input.customData?.tenant_id ?? '',
              external_user_id: input.customData?.external_user_id ?? '',
              ...input.customData,
            },
          },
          checkout_options: {
            embed: false,
            media: false,
            logo: false,
          },
        },
        relationships: {
          store: {
            data: { type: 'stores', id: storeId },
          },
          variant: {
            data: { type: 'variants', id: input.variantId },
          },
        },
      },
    };
    const res = await fetch(`${API_BASE}/checkouts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon checkout failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as {
      data: { id: string; attributes: { url: string } };
    };
    const url = json.data.attributes.url;
    let finalUrl = url;
    if (input.successUrl || input.cancelUrl) {
      const u = new URL(url);
      if (input.successUrl) u.searchParams.set('checkout[redirect_url]', input.successUrl);
      if (input.cancelUrl) u.searchParams.set('checkout[cancel_url]', input.cancelUrl);
      finalUrl = u.toString();
    }
    return { checkoutUrl: finalUrl, externalCheckoutId: json.data.id };
  }

  async createManagementUrl(input: CreateManagementUrlInput): Promise<CreateManagementUrlResult> {
    const { apiKey } = await this.creds(input.providerAccountId);
    const res = await fetch(
      `${API_BASE}/subscriptions/${input.externalSubscriptionId}/portal`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          Accept: 'application/vnd.api+json',
        },
      },
    );
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon customer portal failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as {
      data: { attributes: { url: string } };
    };
    return { url: json.data.attributes.url };
  }

  async cancelSubscription(input: CancelSubscriptionInput): Promise<CancelSubscriptionResult> {
    const { apiKey } = await this.creds(input.providerAccountId);
    const res = await fetch(`${API_BASE}/subscriptions/${input.externalSubscriptionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: input.externalSubscriptionId,
          attributes: {
            cancelled: true,
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon cancel failed: ${res.status} ${t}`);
    }
    return { status: 'canceled' };
  }

  async changeSubscription(input: ChangeSubscriptionInput): Promise<ChangeSubscriptionResult> {
    const { apiKey } = await this.creds(input.providerAccountId);
    const res = await fetch(`${API_BASE}/subscriptions/${input.externalSubscriptionId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
        'Content-Type': 'application/vnd.api+json',
      },
      body: JSON.stringify({
        data: {
          type: 'subscriptions',
          id: input.externalSubscriptionId,
          attributes: {
            variant_id: parseInt(input.newVariantId, 10),
          },
        },
      }),
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon change plan failed: ${res.status} ${t}`);
    }
    return { status: 'updated' };
  }

  async fetchSubscription(input: FetchSubscriptionInput): Promise<FetchSubscriptionResult> {
    const { apiKey } = await this.creds(input.providerAccountId);
    const res = await fetch(`${API_BASE}/subscriptions/${input.externalSubscriptionId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/vnd.api+json',
      },
    });
    if (!res.ok) {
      const t = await res.text();
      throw new Error(`Lemon fetch subscription failed: ${res.status} ${t}`);
    }
    const json = (await res.json()) as {
      data: {
        attributes: {
          status: string;
          ends_at: string | null;
          cancelled: boolean;
          variant_id?: number;
        };
      };
    };
    const a = json.data.attributes;
    const variantId =
      a.variant_id != null ? String(a.variant_id) : undefined;
    return {
      status: a.status,
      cancelAtPeriodEnd: a.cancelled,
      currentPeriodEnd: a.ends_at ? new Date(a.ends_at) : undefined,
      variantId,
      raw: json as unknown as Record<string, unknown>,
    };
  }

  async verifyWebhookSignature(input: VerifyWebhookInput): Promise<VerifyWebhookResult> {
    const secret = await this.webhookSecret(input.providerAccountId);
    if (!secret || !input.signatureHeader) {
      return { valid: false };
    }
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(input.rawBody);
    const digest = Buffer.from(hmac.digest('hex'), 'utf8');
    const signature = Buffer.from(input.signatureHeader, 'utf8');
    if (digest.length !== signature.length) {
      return { valid: false };
    }
    return { valid: crypto.timingSafeEqual(digest, signature) };
  }

  async parseWebhookEvent(input: ParseWebhookInput): Promise<ParsedWebhookEvent> {
    const payload = JSON.parse(input.rawBody.toString('utf8')) as Record<string, unknown>;
    const meta = payload.meta as { event_name?: string; custom_data?: { event_id?: string } } | undefined;
    const eventName = meta?.event_name ?? 'unknown';
    const externalEventId =
      (payload as { meta?: { id?: string } }).meta?.id?.toString() ?? null;
    return { eventName, externalEventId, payload };
  }
}
