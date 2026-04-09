-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "BillingProvider" AS ENUM ('LEMON_SQUEEZY', 'STRIPE', 'PAYPAL');

-- CreateEnum
CREATE TYPE "PlanStatus" AS ENUM ('DRAFT', 'ACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('INCOMPLETE', 'TRIALING', 'ACTIVE', 'PAST_DUE', 'PAUSED', 'CANCELED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "QuotaPeriod" AS ENUM ('LIFETIME', 'MONTH', 'YEAR', 'BILLING_PERIOD');

-- CreateEnum
CREATE TYPE "RegionScopeType" AS ENUM ('GLOBAL', 'COUNTRY', 'REGION');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('CHECKOUT_CREATED', 'CHECKOUT_COMPLETED', 'UPGRADE_REQUESTED', 'DOWNGRADE_REQUESTED', 'CANCEL_REQUESTED', 'CANCEL_SCHEDULED', 'CANCELED', 'RESYNC_REQUESTED', 'RESYNC_COMPLETED', 'PORTAL_URL_CREATED', 'MANUAL_OVERRIDE_APPLIED', 'MANUAL_OVERRIDE_REMOVED');

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tenant" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "brandId" TEXT,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "publicAppName" TEXT,
    "defaultCurrency" VARCHAR(3) NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TenantApiKey" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "keyHash" TEXT NOT NULL,
    "keyPrefix" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "lastUsedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TenantApiKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingProviderAccount" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "displayName" TEXT NOT NULL,
    "accountRef" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT true,
    "credentialsEncrypted" TEXT NOT NULL,
    "webhookSecretEncrypted" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BillingProviderAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProductFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "marketingCopy" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "productFamilyId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "PlanStatus" NOT NULL DEFAULT 'DRAFT',
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "isPublic" BOOLEAN NOT NULL DEFAULT true,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "marketingCopy" JSONB,
    "comparisonData" JSONB,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalPriceId" TEXT NOT NULL,
    "externalVariantId" TEXT,
    "name" TEXT,
    "currency" VARCHAR(3) NOT NULL,
    "unitAmountMinor" INTEGER NOT NULL,
    "billingInterval" TEXT NOT NULL,
    "billingIntervalCount" INTEGER NOT NULL DEFAULT 1,
    "trialDays" INTEGER,
    "regionScopeType" "RegionScopeType" NOT NULL DEFAULT 'GLOBAL',
    "regionCode" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "checkoutConfig" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Feature" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Feature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanFeature" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "featureId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanFeature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanQuota" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "limitValue" INTEGER NOT NULL,
    "period" "QuotaPeriod" NOT NULL DEFAULT 'BILLING_PERIOD',
    "rollover" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PlanQuota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanTag" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlanTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalUser" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalUserId" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "metadata" JSONB,
    "firstSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ExternalUser_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderCustomer" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalUserIdRef" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalCustomerId" TEXT NOT NULL,
    "email" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderCustomer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Subscription" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "externalUserIdRef" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "planPriceId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "externalSubscriptionId" TEXT NOT NULL,
    "externalOrderId" TEXT,
    "status" "SubscriptionStatus" NOT NULL,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3),
    "currentPeriodEnd" TIMESTAMP(3),
    "activatedAt" TIMESTAMP(3),
    "canceledAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "lastProviderSyncAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Subscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ManualEntitlementOverride" (
    "id" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "externalUserIdRef" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "featureKey" TEXT,
    "quotaKey" TEXT,
    "enabled" BOOLEAN,
    "quotaOverride" INTEGER,
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "reason" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ManualEntitlementOverride_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProviderEventLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "provider" "BillingProvider" NOT NULL,
    "eventType" TEXT NOT NULL,
    "externalEventId" TEXT,
    "status" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProviderEventLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubscriptionActionLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subscriptionId" TEXT,
    "externalUserIdRef" TEXT,
    "actionType" "ActionType" NOT NULL,
    "actorType" TEXT NOT NULL,
    "actorRef" TEXT,
    "requestPayload" JSONB,
    "responsePayload" JSONB,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubscriptionActionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdminScope" (
    "id" TEXT NOT NULL,
    "customerId" TEXT,
    "tenantId" TEXT,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminScope_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Customer_slug_key" ON "Customer"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_customerId_slug_key" ON "Brand"("customerId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_customerId_slug_key" ON "Tenant"("customerId", "slug");

-- CreateIndex
CREATE INDEX "TenantApiKey_tenantId_idx" ON "TenantApiKey"("tenantId");

-- CreateIndex
CREATE INDEX "TenantApiKey_keyPrefix_idx" ON "TenantApiKey"("keyPrefix");

-- CreateIndex
CREATE UNIQUE INDEX "BillingProviderAccount_tenantId_provider_accountRef_key" ON "BillingProviderAccount"("tenantId", "provider", "accountRef");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFamily_tenantId_key_key" ON "ProductFamily"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_tenantId_key_key" ON "Plan"("tenantId", "key");

-- CreateIndex
CREATE INDEX "PlanPrice_tenantId_planId_idx" ON "PlanPrice"("tenantId", "planId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_provider_externalPriceId_key" ON "PlanPrice"("provider", "externalPriceId");

-- CreateIndex
CREATE UNIQUE INDEX "Feature_tenantId_key_key" ON "Feature"("tenantId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanFeature_planId_featureId_key" ON "PlanFeature"("planId", "featureId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanQuota_planId_key_key" ON "PlanQuota"("planId", "key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanTag_planId_tag_key" ON "PlanTag"("planId", "tag");

-- CreateIndex
CREATE INDEX "ExternalUser_tenantId_email_idx" ON "ExternalUser"("tenantId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalUser_tenantId_externalUserId_key" ON "ExternalUser"("tenantId", "externalUserId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCustomer_provider_externalCustomerId_key" ON "ProviderCustomer"("provider", "externalCustomerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderCustomer_externalUserIdRef_providerAccountId_key" ON "ProviderCustomer"("externalUserIdRef", "providerAccountId");

-- CreateIndex
CREATE INDEX "Subscription_tenantId_externalUserIdRef_status_idx" ON "Subscription"("tenantId", "externalUserIdRef", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Subscription_provider_externalSubscriptionId_key" ON "Subscription"("provider", "externalSubscriptionId");

-- CreateIndex
CREATE INDEX "ManualEntitlementOverride_tenantId_externalUserIdRef_idx" ON "ManualEntitlementOverride"("tenantId", "externalUserIdRef");

-- CreateIndex
CREATE INDEX "ProviderEventLog_tenantId_provider_createdAt_idx" ON "ProviderEventLog"("tenantId", "provider", "createdAt");

-- CreateIndex
CREATE INDEX "ProviderEventLog_provider_externalEventId_idx" ON "ProviderEventLog"("provider", "externalEventId");

-- CreateIndex
CREATE INDEX "SubscriptionActionLog_tenantId_createdAt_idx" ON "SubscriptionActionLog"("tenantId", "createdAt");

-- CreateIndex
CREATE INDEX "AdminScope_email_idx" ON "AdminScope"("email");

-- AddForeignKey
ALTER TABLE "Brand" ADD CONSTRAINT "Brand_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tenant" ADD CONSTRAINT "Tenant_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TenantApiKey" ADD CONSTRAINT "TenantApiKey_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingProviderAccount" ADD CONSTRAINT "BillingProviderAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProductFamily" ADD CONSTRAINT "ProductFamily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Plan" ADD CONSTRAINT "Plan_productFamilyId_fkey" FOREIGN KEY ("productFamilyId") REFERENCES "ProductFamily"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "BillingProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Feature" ADD CONSTRAINT "Feature_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanFeature" ADD CONSTRAINT "PlanFeature_featureId_fkey" FOREIGN KEY ("featureId") REFERENCES "Feature"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanQuota" ADD CONSTRAINT "PlanQuota_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanTag" ADD CONSTRAINT "PlanTag_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalUser" ADD CONSTRAINT "ExternalUser_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCustomer" ADD CONSTRAINT "ProviderCustomer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCustomer" ADD CONSTRAINT "ProviderCustomer_externalUserIdRef_fkey" FOREIGN KEY ("externalUserIdRef") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderCustomer" ADD CONSTRAINT "ProviderCustomer_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "BillingProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_externalUserIdRef_fkey" FOREIGN KEY ("externalUserIdRef") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_planPriceId_fkey" FOREIGN KEY ("planPriceId") REFERENCES "PlanPrice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subscription" ADD CONSTRAINT "Subscription_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "BillingProviderAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEntitlementOverride" ADD CONSTRAINT "ManualEntitlementOverride_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEntitlementOverride" ADD CONSTRAINT "ManualEntitlementOverride_externalUserIdRef_fkey" FOREIGN KEY ("externalUserIdRef") REFERENCES "ExternalUser"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ManualEntitlementOverride" ADD CONSTRAINT "ManualEntitlementOverride_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEventLog" ADD CONSTRAINT "ProviderEventLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderEventLog" ADD CONSTRAINT "ProviderEventLog_providerAccountId_fkey" FOREIGN KEY ("providerAccountId") REFERENCES "BillingProviderAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionActionLog" ADD CONSTRAINT "SubscriptionActionLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubscriptionActionLog" ADD CONSTRAINT "SubscriptionActionLog_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "Subscription"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminScope" ADD CONSTRAINT "AdminScope_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminScope" ADD CONSTRAINT "AdminScope_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

