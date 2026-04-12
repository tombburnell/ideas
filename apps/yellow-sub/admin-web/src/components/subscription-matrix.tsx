import { Link } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Badge } from './ui/badge';
import { formatMinorUnits } from '../lib/currency';
import type { Feature, PlanDetail, PlanFeature } from '../lib/types';

function featureCell(pf: PlanFeature | undefined) {
  const feat = pf?.feature;
  if (!feat || !pf) return <span className="text-zinc-600">—</span>;
  if (feat.type === 'BOOLEAN') {
    return <Check size={14} className="mx-auto text-emerald-400" />;
  }
  if (feat.type === 'CONFIG') {
    return <span className="text-zinc-200">{pf.configValue ?? '—'}</span>;
  }
  const parts: string[] = [];
  if (pf.includedAmount != null) parts.push(`${pf.includedAmount.toLocaleString()} incl.`);
  if (pf.softLimit != null) parts.push(`soft ${pf.softLimit.toLocaleString()}`);
  if (pf.hardLimit != null) parts.push(`max ${pf.hardLimit.toLocaleString()}`);
  if (!parts.length) parts.push('unlimited');
  if (pf.limitPeriod && pf.limitPeriod !== 'LIFETIME') {
    parts.push(`/${pf.limitPeriod.toLowerCase().replace('_', ' ')}`);
  }
  return <span className="text-xs text-zinc-200">{parts.join(' · ')}</span>;
}

function intervalLabel(iv: string) {
  const m: Record<string, string> = {
    month: 'Monthly',
    year: 'Yearly',
    week: 'Weekly',
    day: 'Daily',
  };
  return m[iv] ?? iv;
}

function planPriceLines(plan: PlanDetail) {
  const prices = plan.prices?.filter((p) => p.active) ?? [];
  const month = prices.find((p) => p.billingInterval === 'month');
  const year = prices.find((p) => p.billingInterval === 'year');
  const lines: { label: string; text: string }[] = [];
  if (month) {
    lines.push({
      label: 'Monthly',
      text: formatMinorUnits(month.unitAmountMinor, month.currency),
    });
  }
  if (year) {
    lines.push({
      label: 'Yearly',
      text: formatMinorUnits(year.unitAmountMinor, year.currency),
    });
  }
  if (!lines.length && prices.length) {
    for (const pr of prices) {
      lines.push({
        label: intervalLabel(pr.billingInterval),
        text: formatMinorUnits(pr.unitAmountMinor, pr.currency),
      });
    }
  }
  return lines;
}

type Props = {
  customerId: string;
  tenantId: string;
  features: Feature[];
  plans: PlanDetail[];
  isLoading: boolean;
};

export function SubscriptionMatrix({ customerId, tenantId, features, plans, isLoading }: Props) {
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const sortedFeatures = [...features].filter((f) => f.active).sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading plan comparison…</p>;
  }

  if (!sortedPlans.length) {
    return (
      <p className="text-sm text-zinc-500">
        No plans yet. Add plans under{' '}
        <Link to={`/customers/${customerId}/tenants/${tenantId}`} className="text-emerald-400 hover:underline">
          Products &amp; Plans
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-zinc-500">
        Active features and limits per plan. Prices shown are from linked provider prices (monthly / yearly when configured).
      </p>
      {!sortedFeatures.length && (
        <p className="text-xs text-amber-500/90">No features defined yet — add some under the Features tab.</p>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-800">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-zinc-800 bg-zinc-900/50">
              <th className="sticky left-0 z-10 min-w-[140px] border-r border-zinc-800 bg-zinc-900/95 px-3 py-2 text-left text-xs font-medium text-zinc-500">
                Feature
              </th>
              {sortedPlans.map((plan) => {
                const priceLines = planPriceLines(plan);
                return (
                  <th
                    key={plan.id}
                    className="min-w-[160px] px-2 py-2 text-center align-bottom text-xs font-medium text-white"
                  >
                    <div className="space-y-1">
                      <div>{plan.name}</div>
                      <div className="font-normal">
                        <Badge>{plan.status}</Badge>
                      </div>
                      <div className="space-y-0.5 text-[11px] font-normal text-zinc-400">
                        {priceLines.length === 0 ? (
                          <span className="text-zinc-600">No prices</span>
                        ) : (
                          priceLines.map((line) => (
                            <div key={line.label}>
                              {line.label}: <span className="font-mono text-zinc-300">{line.text}</span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sortedFeatures.length === 0 && (
              <tr>
                <td
                  colSpan={1 + sortedPlans.length}
                  className="px-3 py-6 text-center text-sm text-zinc-500"
                >
                  Add features to compare plans.
                </td>
              </tr>
            )}
            {sortedFeatures.map((feat) => (
              <tr key={feat.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/30">
                <td className="sticky left-0 z-10 border-r border-zinc-800 bg-zinc-950 px-3 py-2 align-top">
                  <div className="text-white">{feat.name}</div>
                  <code className="text-[10px] text-zinc-600">{feat.key}</code>
                </td>
                {sortedPlans.map((plan) => {
                  const pf = plan.features.find((x) => x.featureId === feat.id);
                  return (
                    <td key={`${plan.id}-${feat.id}`} className="px-2 py-2 text-center align-top">
                      {featureCell(pf)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
