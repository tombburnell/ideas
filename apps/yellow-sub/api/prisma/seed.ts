import { PrismaClient, BillingProvider, PlanStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'node:crypto';

const prisma = new PrismaClient();

const PREFIX = 'v1';
const IV_LEN = 12;
const TAG_LEN = 16;

function encryptJson(key: Buffer, obj: Record<string, unknown>): string {
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const plaintext = Buffer.from(JSON.stringify(obj), 'utf8');
  const enc = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}:${Buffer.concat([iv, tag, enc]).toString('base64')}`;
}

async function main() {
  const hex = process.env.CREDENTIALS_ENCRYPTION_KEY;
  if (!hex || Buffer.from(hex, 'hex').length !== 32) {
    console.error('Set CREDENTIALS_ENCRYPTION_KEY to 64 hex chars before seeding.');
    process.exit(1);
  }
  const key = Buffer.from(hex, 'hex');

  const customer = await prisma.customer.upsert({
    where: { slug: 'demo-corp' },
    create: { name: 'Demo Corp', slug: 'demo-corp' },
    update: {},
  });

  await prisma.brand.upsert({
    where: {
      customerId_slug: { customerId: customer.id, slug: 'demo-brand' },
    },
    create: {
      customerId: customer.id,
      name: 'Demo Brand',
      slug: 'demo-brand',
    },
    update: {},
  });

  const tenant = await prisma.tenant.upsert({
    where: {
      customerId_slug: { customerId: customer.id, slug: 'demo-app' },
    },
    create: {
      customerId: customer.id,
      name: 'Demo App',
      slug: 'demo-app',
      defaultCurrency: 'USD',
      publicAppName: 'Demo',
    },
    update: {},
  });

  const rawApiKey = 'ys_dev_replace_in_production_0000000000000000';
  const keyHash = await bcrypt.hash(rawApiKey, 12);
  const keyPrefix = rawApiKey.slice(0, 12);
  const existingKey = await prisma.tenantApiKey.findFirst({
    where: { tenantId: tenant.id, name: 'Development' },
  });
  if (!existingKey) {
    await prisma.tenantApiKey.create({
      data: {
        tenantId: tenant.id,
        name: 'Development',
        keyHash,
        keyPrefix,
      },
    });
  }

  const credEnc = encryptJson(key, {
    apiKey: process.env.LEMON_API_KEY ?? 'replace-me',
    storeId: process.env.LEMON_STORE_ID ?? 'replace-me',
  });
  const whEnc = encryptJson(key, {
    secret: process.env.LEMON_WEBHOOK_SECRET ?? 'replace-me',
  });

  let provider = await prisma.billingProviderAccount.findFirst({
    where: {
      tenantId: tenant.id,
      provider: BillingProvider.LEMON_SQUEEZY,
      accountRef: 'default',
    },
  });
  if (!provider) {
    provider = await prisma.billingProviderAccount.create({
      data: {
        tenantId: tenant.id,
        provider: BillingProvider.LEMON_SQUEEZY,
        displayName: 'Lemon (dev)',
        accountRef: 'default',
        credentialsEncrypted: credEnc,
        webhookSecretEncrypted: whEnc,
      },
    });
  } else {
    provider = await prisma.billingProviderAccount.update({
      where: { id: provider.id },
      data: {
        credentialsEncrypted: credEnc,
        webhookSecretEncrypted: whEnc,
      },
    });
  }

  const family = await prisma.productFamily.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'main' } },
    create: {
      tenantId: tenant.id,
      key: 'main',
      name: 'Main product',
    },
    update: {},
  });

  const plan = await prisma.plan.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'pro' } },
    create: {
      tenantId: tenant.id,
      productFamilyId: family.id,
      key: 'pro',
      name: 'Pro',
      status: PlanStatus.ACTIVE,
    },
    update: {},
  });

  await prisma.planPrice.upsert({
    where: {
      provider_externalPriceId: {
        provider: BillingProvider.LEMON_SQUEEZY,
        externalPriceId: 'seed-price-1',
      },
    },
    create: {
      tenantId: tenant.id,
      planId: plan.id,
      providerAccountId: provider.id,
      provider: BillingProvider.LEMON_SQUEEZY,
      externalPriceId: 'seed-price-1',
      externalVariantId: process.env.LEMON_VARIANT_ID ?? '1',
      currency: 'USD',
      unitAmountMinor: 1000,
      billingInterval: 'month',
      name: 'Pro monthly',
    },
    update: {},
  });

  await prisma.feature.upsert({
    where: { tenantId_key: { tenantId: tenant.id, key: 'advanced_stats' } },
    create: {
      tenantId: tenant.id,
      key: 'advanced_stats',
      name: 'Advanced stats',
    },
    update: {},
  });

  const feat = await prisma.feature.findFirstOrThrow({
    where: { tenantId: tenant.id, key: 'advanced_stats' },
  });
  await prisma.planFeature.upsert({
    where: {
      planId_featureId: { planId: plan.id, featureId: feat.id },
    },
    create: { planId: plan.id, featureId: feat.id, enabled: true },
    update: {},
  });

  const existingScope = await prisma.adminScope.findFirst({
    where: { email: 'admin@example.com', customerId: customer.id },
  });
  if (!existingScope) {
    await prisma.adminScope.create({
      data: {
        email: 'admin@example.com',
        role: 'superadmin',
        customerId: customer.id,
      },
    });
  }

  console.log('Seed complete.');
  console.log('Tenant slug: demo-app');
  console.log('API key (dev only):', rawApiKey);
  console.log('Set LEMON_* env vars and re-seed to update provider credentials.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
