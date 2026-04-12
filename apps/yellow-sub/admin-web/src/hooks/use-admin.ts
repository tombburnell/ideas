import { useMutation, useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../lib/auth-context';
import { adminFetch } from '../lib/api';
import type {
  BillingProviderAccount,
  Brand,
  Customer,
  ExternalUser,
  Feature,
  MeteringTier,
  Plan,
  PlanDetail,
  PlanFeature,
  ProductFamily,
  ProviderEventLog,
  Subscription,
  TenantApiKey,
  Tenant,
} from '../lib/types';

function useToken() {
  const { getIdToken } = useAuth();
  return getIdToken;
}

async function get<T>(path: string, token: string | null): Promise<T> {
  const res = await adminFetch(path, token);
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function post<T>(path: string, token: string | null, body: unknown): Promise<T> {
  const res = await adminFetch(path, token, {
    method: 'POST',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function put<T>(path: string, token: string | null, body: unknown): Promise<T> {
  const res = await adminFetch(path, token, {
    method: 'PUT',
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

async function del<T>(path: string, token: string | null): Promise<T> {
  const res = await adminFetch(path, token, { method: 'DELETE' });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}

// ── Customers ──

export function useCustomers() {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => get<Customer[]>('/api/v1/admin/customers', await getToken()),
  });
}

export function useCreateCustomer() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; slug: string }) =>
      post<Customer>('/api/v1/admin/customers', await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'customers'] }),
  });
}

export function useUpdateCustomer(id: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; active?: boolean }) =>
      put<Customer>(`/api/v1/admin/customers/${id}`, await getToken(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'customers'] });
    },
  });
}

// ── Brands ──

export function useBrands(customerId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'brands', customerId],
    queryFn: async () =>
      get<Brand[]>(`/api/v1/admin/brands?customerId=${customerId}`, await getToken()),
  });
}

export function useCreateBrand() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { customerId: string; name: string; slug: string }) =>
      post<Brand>('/api/v1/admin/brands', await getToken(), body),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['admin', 'brands', vars.customerId] }),
  });
}

// ── Tenants ──

export function useTenants(customerId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'tenants', customerId],
    queryFn: async () =>
      get<Tenant[]>(`/api/v1/admin/tenants?customerId=${customerId}`, await getToken()),
  });
}

export function useCreateTenant() {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      customerId: string;
      brandId?: string;
      name: string;
      slug: string;
      defaultCurrency: string;
      publicAppName?: string;
    }) => post<Tenant>('/api/v1/admin/tenants', await getToken(), body),
    onSuccess: (_d, vars) => qc.invalidateQueries({ queryKey: ['admin', 'tenants', vars.customerId] }),
  });
}

// ── Provider Accounts ──

export function useProviderAccounts(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'provider-accounts', tenantId],
    queryFn: async () =>
      get<BillingProviderAccount[]>(
        `/api/v1/admin/tenants/${tenantId}/provider-accounts`,
        await getToken(),
      ),
  });
}

export function useCreateProviderAccount(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      provider: string;
      displayName: string;
      accountRef: string;
      credentials: Record<string, unknown>;
      webhookSecret?: string;
    }) => post<BillingProviderAccount>(`/api/v1/admin/tenants/${tenantId}/provider-accounts`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'provider-accounts', tenantId] }),
  });
}

// ── API Keys ──

export function useApiKeys(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'api-keys', tenantId],
    queryFn: async () =>
      get<TenantApiKey[]>(`/api/v1/admin/tenants/${tenantId}/api-keys`, await getToken()),
  });
}

export function useCreateApiKey(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string }) =>
      post<{ apiKey: string; keyPrefix: string }>(
        `/api/v1/admin/tenants/${tenantId}/api-keys`,
        await getToken(),
        body,
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'api-keys', tenantId] }),
  });
}

// ── Product Families ──

export function useProductFamilies(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'product-families', tenantId],
    queryFn: async () =>
      get<ProductFamily[]>(`/api/v1/admin/tenants/${tenantId}/product-families`, await getToken()),
  });
}

export function useCreateProductFamily(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { key: string; name: string; description?: string }) =>
      post<ProductFamily>(`/api/v1/admin/tenants/${tenantId}/product-families`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'product-families', tenantId] }),
  });
}

export function useUpdateProductFamily(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: { id: string; name?: string; description?: string; active?: boolean }) =>
      put<ProductFamily>(`/api/v1/admin/product-families/${id}`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'product-families', tenantId] }),
  });
}

export function useDeleteProductFamily(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      del<ProductFamily>(`/api/v1/admin/product-families/${id}`, await getToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'product-families', tenantId] }),
  });
}

// ── Plans ──

export function usePlans(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'plans', tenantId],
    queryFn: async () =>
      get<Plan[]>(`/api/v1/admin/tenants/${tenantId}/plans`, await getToken()),
  });
}

export function usePlan(planId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'plan', planId],
    queryFn: async () => get<PlanDetail>(`/api/v1/admin/plans/${planId}`, await getToken()),
  });
}

export function useCreatePlan(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      productFamilyId: string;
      key: string;
      name: string;
      description?: string;
      status?: string;
    }) => post<Plan>(`/api/v1/admin/tenants/${tenantId}/plans`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plans', tenantId] }),
  });
}

export function useUpdatePlan(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; description?: string; status?: string; active?: boolean }) =>
      put<Plan>(`/api/v1/admin/plans/${planId}`, await getToken(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] });
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
}

export function useDeletePlan(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) =>
      del<Plan>(`/api/v1/admin/plans/${planId}`, await getToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plans', tenantId] }),
  });
}

// ── Plan Prices ──

export function useCreatePlanPrice(tenantId: string, planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      providerAccountId: string;
      provider: string;
      externalPriceId: string;
      externalVariantId?: string;
      currency: string;
      unitAmountMinor: number;
      billingInterval: string;
      name?: string;
    }) =>
      post(`/api/v1/admin/tenants/${tenantId}/plan-prices`, await getToken(), {
        planId,
        ...body,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

export function useUpdatePlanPrice(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      planPriceId,
      ...body
    }: {
      planPriceId: string;
      providerAccountId?: string;
      provider?: string;
      externalPriceId?: string;
      externalVariantId?: string | null;
      currency?: string;
      unitAmountMinor?: number;
      billingInterval?: string;
      name?: string | null;
    }) =>
      put(`/api/v1/admin/plan-prices/${planPriceId}`, await getToken(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] });
      qc.invalidateQueries({ queryKey: ['admin', 'plans'] });
    },
  });
}

/** Loads full plan details (prices + linked features) for every plan in a tenant — for comparison matrix. */
export function usePlansWithDetails(tenantId: string) {
  const getToken = useToken();
  const plans = usePlans(tenantId);
  const planIds = plans.data?.map((p) => p.id) ?? [];
  const details = useQueries({
    queries: planIds.map((id) => ({
      queryKey: ['admin', 'plan', id] as const,
      queryFn: async () => get<PlanDetail>(`/api/v1/admin/plans/${id}`, await getToken()),
      enabled: !!tenantId && planIds.length > 0,
    })),
  });
  const loading =
    plans.isLoading ||
    (planIds.length > 0 && details.some((q) => q.isLoading || q.isFetching));
  const list = details.map((q) => q.data).filter((x): x is PlanDetail => x != null);
  const error = plans.error ?? details.find((q) => q.error)?.error;
  return { plans, details: list, isLoading: loading, error };
}

// ── Features ──

export function useFeatures(
  tenantId: string,
  productFamilyId?: string,
  opts?: { enabledWhenFamilyMissing?: boolean },
) {
  const getToken = useToken();
  const q = productFamilyId ? `?productFamilyId=${encodeURIComponent(productFamilyId)}` : '';
  const waitForFamily = opts?.enabledWhenFamilyMissing === false;
  const enabled =
    !!tenantId && (!waitForFamily || productFamilyId !== undefined);
  return useQuery({
    queryKey: ['admin', 'features', tenantId, productFamilyId ?? 'all'],
    queryFn: async () =>
      get<Feature[]>(`/api/v1/admin/tenants/${tenantId}/features${q}`, await getToken()),
    enabled,
  });
}

export function useCreateFeature(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      productFamilyId: string;
      key: string;
      name: string;
      description?: string;
      type?: string;
      unitLabel?: string;
      configType?: string;
      configOptions?: string[];
    }) =>
      post<Feature>(`/api/v1/admin/tenants/${tenantId}/features`, await getToken(), body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'features', tenantId] });
    },
  });
}

export function useUpdateFeature(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...body }: {
      id: string;
      name?: string;
      description?: string;
      active?: boolean;
      type?: string;
      unitLabel?: string;
      configType?: string;
      configOptions?: string[];
    }) =>
      put<Feature>(`/api/v1/admin/features/${id}`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'features', tenantId] }),
  });
}

export function useDeleteFeature(tenantId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      del<Feature>(`/api/v1/admin/features/${id}`, await getToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'features', tenantId] }),
  });
}

// ── Plan Features ──

export function useLinkPlanFeature(tenantId: string, planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: {
      featureId: string;
      includedAmount?: number;
      softLimit?: number;
      hardLimit?: number;
      limitPeriod?: string;
      tierMode?: string;
      configValue?: string;
    }) =>
      post<PlanFeature>(`/api/v1/admin/tenants/${tenantId}/plans/${planId}/plan-features`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

export function useUpdatePlanFeature(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planFeatureId, ...body }: {
      planFeatureId: string;
      includedAmount?: number | null;
      softLimit?: number | null;
      hardLimit?: number | null;
      limitPeriod?: string | null;
      tierMode?: string | null;
      configValue?: string | null;
    }) =>
      put<PlanFeature>(`/api/v1/admin/plan-features/${planFeatureId}`, await getToken(), body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

export function useUnlinkPlanFeature(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planFeatureId: string) =>
      del<PlanFeature>(`/api/v1/admin/plan-features/${planFeatureId}`, await getToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

export function useUpsertTiers(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planFeatureId, tiers }: {
      planFeatureId: string;
      tiers: { fromUnit: number; toUnit?: number | null; unitPriceMinor: number; flatFeeMinor?: number; currency: string }[];
    }) =>
      post<MeteringTier[]>(`/api/v1/admin/plan-features/${planFeatureId}/tiers`, await getToken(), { tiers }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

export function useDeleteTier(planId: string) {
  const getToken = useToken();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ planFeatureId, tierId }: { planFeatureId: string; tierId: string }) =>
      del<MeteringTier>(`/api/v1/admin/plan-features/${planFeatureId}/tiers/${tierId}`, await getToken()),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'plan', planId] }),
  });
}

// ── External Users ──

export function useExternalUsers(tenantId: string, q?: string) {
  const getToken = useToken();
  const params = q ? `?q=${encodeURIComponent(q)}` : '';
  return useQuery({
    queryKey: ['admin', 'users', tenantId, q],
    queryFn: async () =>
      get<ExternalUser[]>(`/api/v1/admin/tenants/${tenantId}/users${params}`, await getToken()),
  });
}

// ── Subscriptions ──

export function useSubscriptions(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'subscriptions', tenantId],
    queryFn: async () =>
      get<Subscription[]>(`/api/v1/admin/tenants/${tenantId}/subscriptions`, await getToken()),
  });
}

export function useResyncSubscription() {
  const getToken = useToken();
  return useMutation({
    mutationFn: async (subscriptionId: string) =>
      post(`/api/v1/admin/subscriptions/${subscriptionId}/resync`, await getToken(), {}),
  });
}

// ── Events ──

export function useEvents(tenantId: string) {
  const getToken = useToken();
  return useQuery({
    queryKey: ['admin', 'events', tenantId],
    queryFn: async () =>
      get<ProviderEventLog[]>(`/api/v1/admin/tenants/${tenantId}/events`, await getToken()),
  });
}
