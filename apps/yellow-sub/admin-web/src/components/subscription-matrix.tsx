import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Check, Pencil } from 'lucide-react';
import { Badge } from './ui/badge';
import { formatMinorUnits } from '../lib/currency';
import { formatPlanFeatureConfigDisplay } from '../lib/feature-config';
import { formatIncludedLimitFragment } from '../lib/plan-feature-limit-display';
import type { Feature, PlanDetail, PlanFeature, ProductFamily } from '../lib/types';

function featureCell(pf: PlanFeature | undefined) {
  const feat = pf?.feature;
  if (!feat || !pf) return <span className="text-zinc-600">—</span>;
  if (feat.type === 'BOOLEAN') {
    return <Check size={14} className="mx-auto text-emerald-400" />;
  }
  if (feat.type === 'CONFIG') {
    return (
      <span className="text-zinc-200">
        {formatPlanFeatureConfigDisplay(pf, feat)}
      </span>
    );
  }
  const unit = feat.unitLabel?.trim();
  const segments: ReactNode[] = [];
  if (pf.includedAmount != null) {
    segments.push(formatIncludedLimitFragment(pf.includedAmount, unit, 'incl.'));
  }
  if (pf.softLimit != null) segments.push(`soft ${pf.softLimit.toLocaleString()}`);
  if (pf.hardLimit != null) segments.push(`max ${pf.hardLimit.toLocaleString()}`);
  if (!segments.length) segments.push('unlimited');
  if (pf.limitPeriod && pf.limitPeriod !== 'LIFETIME') {
    segments.push(`/${pf.limitPeriod.toLowerCase().replace('_', ' ')}`);
  }
  const trailingUnit = pf.includedAmount == null && unit ? (
    <>
      {' '}
      <span className="text-zinc-500">{unit}</span>
    </>
  ) : null;
  return (
    <span className="text-xs text-zinc-200">
      {segments.map((s, i) => (
        <Fragment key={i}>
          {i > 0 ? ' · ' : null}
          {s}
        </Fragment>
      ))}
      {trailingUnit}
    </span>
  );
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

type PriceLine = { label: string; text: string; priceId?: string };

function planPriceLines(plan: PlanDetail): PriceLine[] {
  const prices = plan.prices?.filter((p) => p.active) ?? [];
  const month = prices.find((p) => p.billingInterval === 'month');
  const year = prices.find((p) => p.billingInterval === 'year');
  const lines: PriceLine[] = [];
  if (month) {
    lines.push({
      label: 'Monthly',
      text: formatMinorUnits(month.unitAmountMinor, month.currency),
      priceId: month.id,
    });
  }
  if (year) {
    lines.push({
      label: 'Yearly',
      text: formatMinorUnits(year.unitAmountMinor, year.currency),
      priceId: year.id,
    });
  }
  if (!lines.length && prices.length) {
    for (const pr of prices) {
      lines.push({
        label: intervalLabel(pr.billingInterval),
        text: formatMinorUnits(pr.unitAmountMinor, pr.currency),
        priceId: pr.id,
      });
    }
  }
  return lines;
}

function familyMatrixTable(
  customerId: string,
  tenantId: string,
  features: Feature[],
  plans: PlanDetail[],
  isLoading: boolean,
) {
  const tenantBase = `/customers/${customerId}/tenants/${tenantId}`;
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  const linkedFeatureIds = new Set<string>();
  for (const plan of sortedPlans) {
    for (const pf of plan.features ?? []) {
      linkedFeatureIds.add(pf.featureId);
    }
  }
  const sortedFeatures = [...features]
    .filter((f) => f.active && linkedFeatureIds.has(f.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }

  if (!sortedPlans.length) {
    return (
      <p className="text-sm text-zinc-500">
        No plans in this family yet. Add plans under{' '}
        <Link to={`/customers/${customerId}/tenants/${tenantId}?tab=products`} className="text-emerald-400 hover:underline">
          Products &amp; Plans
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-800">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            <th className="sticky left-0 z-10 min-w-[140px] border-r border-zinc-800 bg-zinc-900/95 px-3 py-2 text-left text-xs font-medium text-zinc-500">
              Feature
            </th>
            {sortedPlans.map((plan) => {
              const priceLines = planPriceLines(plan);
              const planBase = `${tenantBase}/plans/${plan.id}`;
              return (
                <th
                  key={plan.id}
                  className="min-w-[160px] px-2 py-2 text-center align-bottom text-xs font-medium text-white"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-center gap-1">
                      <span>{plan.name}</span>
                      <Link
                        to={`${tenantBase}?overviewPlan=${encodeURIComponent(plan.id)}&overviewModal=plan`}
                        title="Edit plan"
                        className="inline-flex shrink-0 text-zinc-500 hover:text-emerald-400"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Pencil size={12} aria-hidden />
                        <span className="sr-only">Edit plan</span>
                      </Link>
                    </div>
                    <div className="font-normal">
                      <Badge>{plan.status}</Badge>
                    </div>
                    <div className="space-y-0.5 text-[11px] font-normal text-zinc-400">
                      {priceLines.length === 0 ? (
                        <div className="flex items-center justify-center gap-1">
                          <span className="text-zinc-600">No prices</span>
                          <Link
                            to={`${planBase}#provider-prices`}
                            title="Add or edit prices on plan page"
                            className="inline-flex shrink-0 text-zinc-500 hover:text-emerald-400"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Pencil size={12} aria-hidden />
                            <span className="sr-only">Edit prices</span>
                          </Link>
                        </div>
                      ) : (
                        priceLines.map((line) => (
                          <div key={`${line.label}-${line.priceId ?? line.text}`} className="flex items-center justify-center gap-1">
                            <span>
                              {line.label}: <span className="font-mono text-zinc-300">{line.text}</span>
                            </span>
                            {line.priceId ? (
                              <Link
                                to={`${tenantBase}?overviewPlan=${encodeURIComponent(plan.id)}&overviewModal=price&overviewPrice=${encodeURIComponent(line.priceId)}`}
                                title="Edit this price"
                                className="inline-flex shrink-0 text-zinc-500 hover:text-emerald-400"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Pencil size={12} aria-hidden />
                                <span className="sr-only">Edit price</span>
                              </Link>
                            ) : null}
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
                No features linked to any plan in this family — link features from each plan under Products &amp; Plans.
              </td>
            </tr>
          )}
          {sortedFeatures.map((feat) => (
            <tr key={feat.id} className="border-b border-zinc-800/80 hover:bg-zinc-900/30">
              <td className="sticky left-0 z-10 border-r border-zinc-800 bg-zinc-950 px-3 py-2 align-top">
                <div className="flex items-center gap-1.5">
                  <span className="text-white">{feat.name}</span>
                  <Link
                    to={`${tenantBase}?overviewEditFeature=${encodeURIComponent(feat.id)}&overviewFeatureFamily=${encodeURIComponent(feat.productFamilyId)}`}
                    title="Edit feature"
                    className="inline-flex shrink-0 text-zinc-500 hover:text-emerald-400"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Pencil size={12} aria-hidden />
                    <span className="sr-only">Edit feature</span>
                  </Link>
                </div>
                <code className="text-[10px] text-zinc-600">{feat.key}</code>
              </td>
              {sortedPlans.map((plan) => {
                const pf = plan.features.find((x) => x.featureId === feat.id);
                const canEditPlanFeature =
                  !!pf && feat.type !== 'BOOLEAN';
                return (
                  <td key={`${plan.id}-${feat.id}`} className="px-2 py-2 text-center align-top">
                    <div className="flex items-start justify-center gap-1">
                      <div className="min-w-0 flex-1">{featureCell(pf)}</div>
                      {canEditPlanFeature ? (
                        <Link
                          to={`${tenantBase}?overviewPlan=${encodeURIComponent(plan.id)}&overviewModal=planFeature&overviewPlanFeature=${encodeURIComponent(pf!.id)}`}
                          title="Edit value on this plan"
                          className="inline-flex shrink-0 pt-0.5 text-zinc-500 hover:text-emerald-400"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Pencil size={12} aria-hidden />
                          <span className="sr-only">Edit plan feature</span>
                        </Link>
                      ) : null}
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export type SubscriptionMatrixSection = {
  family: ProductFamily;
  features: Feature[];
  plans: PlanDetail[];
};

type Props = {
  customerId: string;
  tenantId: string;
  sections: SubscriptionMatrixSection[];
  isLoading: boolean;
};

/** One comparison table per product family (stacked). */
export function SubscriptionMatrix({ customerId, tenantId, sections, isLoading }: Props) {
  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading plan comparison…</p>;
  }

  if (!sections.length) {
    return (
      <p className="text-sm text-zinc-500">
        No product families yet. Add a family under{' '}
        <Link to={`/customers/${customerId}/tenants/${tenantId}?tab=products`} className="text-emerald-400 hover:underline">
          Products &amp; Plans
        </Link>
        .
      </p>
    );
  }

  return (
    <div className="space-y-8">     
      {sections.map(({ family, features, plans }) => (
        <div key={family.id} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-medium text-white">{family.name}</h3>
            <code className="text-[10px] text-zinc-600">{family.key}</code>
          </div>
          {familyMatrixTable(customerId, tenantId, features, plans, false)}
        </div>
      ))}
    </div>
  );
}
