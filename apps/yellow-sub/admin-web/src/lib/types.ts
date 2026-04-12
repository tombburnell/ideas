export type Customer = {
  id: string;
  name: string;
  slug: string;
  active: boolean;
  createdAt: string;
};

export type Brand = {
  id: string;
  customerId: string;
  name: string;
  slug: string;
  active: boolean;
};

export type Tenant = {
  id: string;
  customerId: string;
  brandId?: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  publicAppName?: string;
  active: boolean;
  customer?: Customer;
  brand?: Brand;
};

export type TenantApiKey = {
  id: string;
  name: string;
  keyPrefix: string;
  active: boolean;
  lastUsedAt?: string;
  createdAt: string;
};

export type BillingProviderAccount = {
  id: string;
  provider: string;
  displayName: string;
  accountRef: string;
  active: boolean;
  isDefault: boolean;
  createdAt: string;
};

export type ProductFamily = {
  id: string;
  tenantId: string;
  key: string;
  name: string;
  description?: string;
  active: boolean;
  sortOrder: number;
};

export type Plan = {
  id: string;
  tenantId: string;
  productFamilyId: string;
  key: string;
  name: string;
  description?: string;
  status: 'DRAFT' | 'ACTIVE' | 'ARCHIVED';
  isPrimary: boolean;
  isPublic: boolean;
  active: boolean;
  sortOrder: number;
  productFamily?: ProductFamily;
};

export type PlanPrice = {
  id: string;
  planId: string;
  providerAccountId: string;
  provider: string;
  externalPriceId: string;
  externalVariantId?: string;
  name?: string;
  currency: string;
  unitAmountMinor: number;
  billingInterval: string;
  billingIntervalCount: number;
  trialDays?: number;
  isDefault: boolean;
  active: boolean;
  providerAccount?: BillingProviderAccount;
};

export type Feature = {
  id: string;
  tenantId: string;
  productFamilyId: string;
  key: string;
  name: string;
  description?: string;
  type: 'BOOLEAN' | 'LIMIT' | 'CONFIG';
  unitLabel?: string;
  configType?: 'INTEGER' | 'ENUM';
  configOptions?: string[];
  active: boolean;
  productFamily?: Pick<ProductFamily, 'id' | 'key' | 'name'>;
};

export type MeteringTier = {
  id: string;
  planFeatureId: string;
  fromUnit: number;
  toUnit: number | null;
  unitPriceMinor: number;
  flatFeeMinor: number;
  currency: string;
};

export type PlanFeature = {
  id: string;
  planId: string;
  featureId: string;
  includedAmount: number | null;
  softLimit: number | null;
  hardLimit: number | null;
  limitPeriod: string | null;
  tierMode: 'GRADUATED' | 'VOLUME' | null;
  configValue: string | null;
  feature?: Feature;
  tiers?: MeteringTier[];
};

export type ExternalUser = {
  id: string;
  tenantId: string;
  externalUserId: string;
  email?: string;
  displayName?: string;
  firstSeenAt: string;
  lastSeenAt: string;
};

export type Subscription = {
  id: string;
  tenantId: string;
  externalUserIdRef: string;
  planId: string;
  status: string;
  cancelAtPeriodEnd: boolean;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  plan?: Plan;
  externalUser?: ExternalUser;
};

export type ProviderEventLog = {
  id: string;
  provider: string;
  eventType: string;
  status: string;
  payload: unknown;
  errorMessage?: string;
  createdAt: string;
};

export type PlanDetail = Plan & {
  prices: PlanPrice[];
  features: PlanFeature[];
};
