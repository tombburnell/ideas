export type YellowSubClientOptions = {
  baseUrl: string;
  apiKey: string;
};

async function req<T>(
  method: string,
  url: string,
  opts: YellowSubClientOptions,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${opts.baseUrl.replace(/\/$/, '')}${url}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'X-Api-Key': opts.apiKey,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Yellow Sub ${res.status}: ${t}`);
  }
  return res.json() as Promise<T>;
}

export function createYellowSubClient(opts: YellowSubClientOptions) {
  const tenant = (slug: string) => {
    const p = `/api/v1/public/tenants/${encodeURIComponent(slug)}`;
    return {
      getCatalog: (query?: { currency?: string; region?: string; tags?: string }) =>
        req('GET', `${p}/catalog${toQuery(query)}`, opts),

      registerOrSyncUser: (payload: {
        externalUserId: string;
        email?: string;
        displayName?: string;
        metadata?: Record<string, unknown>;
      }) => req('POST', `${p}/users/register-or-sync`, opts, payload),

      getUserSubscription: (externalUserId: string) =>
        req('GET', `${p}/users/${encodeURIComponent(externalUserId)}/subscription`, opts),

      getUserEntitlements: (externalUserId: string) =>
        req('GET', `${p}/users/${encodeURIComponent(externalUserId)}/entitlements`, opts),

      createCheckout: (
        externalUserId: string,
        payload: {
          planPriceId?: string;
          planKey?: string;
          successUrl: string;
          cancelUrl: string;
        },
      ) => req('POST', `${p}/users/${encodeURIComponent(externalUserId)}/checkout`, opts, payload),

      changePlan: (
        externalUserId: string,
        payload: { planPriceId: string },
      ) =>
        req(
          'POST',
          `${p}/users/${encodeURIComponent(externalUserId)}/change-plan`,
          opts,
          payload,
        ),

      cancelSubscription: (
        externalUserId: string,
        payload: { immediate?: boolean },
      ) =>
        req(
          'POST',
          `${p}/users/${encodeURIComponent(externalUserId)}/cancel`,
          opts,
          payload,
        ),

      getManagementUrl: (externalUserId: string) =>
        req(
          'POST',
          `${p}/users/${encodeURIComponent(externalUserId)}/management-url`,
          opts,
        ),
    };
  };
  return { tenant };
}

function toQuery(q?: Record<string, string | undefined>): string {
  if (!q) return '';
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(q)) {
    if (v != null) p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}
