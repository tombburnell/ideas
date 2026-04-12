import { useEffect, useRef, useState } from 'react';
import {
  usePlan,
  useProviderAccounts,
  useTenants,
  useUpdatePlan,
  useUpdatePlanFeature,
  useUpdatePlanPrice,
} from '../hooks/use-admin';
import { Button } from './ui/button';
import { Dialog } from './ui/dialog';
import { Input, Textarea } from './ui/input';
import { Select } from './ui/select';
import { useToast } from './ui/toast';
import { CURRENCIES, formatMinorUnits } from '../lib/currency';
import {
  majorAmountStringFromMinor,
  parseIntegerConfigInput,
  parseMoneyConfigInput,
  parseStoredMoneyConfig,
} from '../lib/feature-config';
import type { PlanFeature, PlanPrice } from '../lib/types';

export type PlanOverviewModalKind = 'plan' | 'price' | 'planFeature';

type Props = {
  customerId: string;
  tenantId: string;
  planId: string | null;
  modalKind: PlanOverviewModalKind | null;
  priceId?: string | null;
  planFeatureId?: string | null;
  onClose: () => void;
};

export function PlanOverviewModals({
  customerId,
  tenantId,
  planId,
  modalKind,
  priceId,
  planFeatureId,
  onClose,
}: Props) {
  const { toast } = useToast();
  const tenants = useTenants(customerId);
  const tenant = tenants.data?.find((t) => t.id === tenantId);
  const plan = usePlan(planId ?? '', { enabled: !!planId });
  const accounts = useProviderAccounts(tenantId);
  const updatePlan = useUpdatePlan(planId ?? '');
  const updatePrice = useUpdatePlanPrice(planId ?? '');
  const updatePlanFeature = useUpdatePlanFeature(planId ?? '');

  const [eName, setEName] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eStatus, setEStatus] = useState('DRAFT');

  const [editPriceRow, setEditPriceRow] = useState<PlanPrice | null>(null);
  const [epAccountId, setEpAccountId] = useState('');
  const [epProvider, setEpProvider] = useState('');
  const [epExtId, setEpExtId] = useState('');
  const [epVariantId, setEpVariantId] = useState('');
  const [epCurrency, setEpCurrency] = useState('');
  const [epAmount, setEpAmount] = useState('');
  const [epInterval, setEpInterval] = useState('month');
  const [epDisplayName, setEpDisplayName] = useState('');

  const [editPf, setEditPf] = useState<PlanFeature | null>(null);
  const [epIncluded, setEpIncluded] = useState('');
  const [epSoft, setEpSoft] = useState('');
  const [epHard, setEpHard] = useState('');
  const [epPeriod, setEpPeriod] = useState('MONTH');
  const [epResets, setEpResets] = useState(false);
  const [epTierMode, setEpTierMode] = useState('');
  const [epConfigValue, setEpConfigValue] = useState('');
  const [epMoneyAmount, setEpMoneyAmount] = useState('');
  const [epMoneyCurrency, setEpMoneyCurrency] = useState('');

  const seededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!plan.data || !modalKind || !tenant) return;
    const seedKey = `${modalKind}|${planId}|${priceId ?? ''}|${planFeatureId ?? ''}`;
    if (seededKeyRef.current === seedKey) return;
    seededKeyRef.current = seedKey;

    const p = plan.data;
    if (modalKind === 'plan') {
      setEName(p.name);
      setEDesc(p.description ?? '');
      setEStatus(p.status);
      return;
    }
    if (modalKind === 'price' && priceId) {
      const row = p.prices.find((pr) => pr.id === priceId);
      if (!row) {
        toast('Price not found on this plan', 'error');
        onClose();
        return;
      }
      setEditPriceRow(row);
      setEpAccountId(row.providerAccountId);
      setEpProvider(row.provider);
      setEpExtId(row.externalPriceId);
      setEpVariantId(row.externalVariantId ?? '');
      setEpCurrency(row.currency);
      setEpAmount(row.unitAmountMinor.toString());
      setEpInterval(row.billingInterval);
      setEpDisplayName(row.name ?? '');
      return;
    }
    if (modalKind === 'planFeature' && planFeatureId) {
      const pf = p.features.find((x) => x.id === planFeatureId);
      if (!pf) {
        toast('Plan feature not found', 'error');
        onClose();
        return;
      }
      setEditPf(pf);
      setEpIncluded(pf.includedAmount?.toString() ?? '');
      setEpSoft(pf.softLimit?.toString() ?? '');
      setEpHard(pf.hardLimit?.toString() ?? '');
      const hasReset = !!pf.limitPeriod && pf.limitPeriod !== 'LIFETIME';
      setEpResets(hasReset);
      setEpPeriod(hasReset ? pf.limitPeriod! : 'MONTH');
      setEpTierMode(pf.tierMode ?? '');
      const f = pf.feature;
      if (f?.type === 'CONFIG' && f.configType === 'MONEY') {
        const parsed = parseStoredMoneyConfig(pf.configValue);
        setEpMoneyCurrency(parsed?.currency ?? tenant.defaultCurrency);
        setEpMoneyAmount(
          parsed ? majorAmountStringFromMinor(parsed.amountMinor, parsed.currency) : '',
        );
        setEpConfigValue('');
      } else {
        setEpMoneyCurrency(tenant.defaultCurrency);
        setEpMoneyAmount('');
        setEpConfigValue(pf.configValue ?? '');
      }
    }
  }, [plan.data, modalKind, priceId, planFeatureId, tenant, planId, toast, onClose]);

  useEffect(() => {
    if (!planId || !modalKind) {
      seededKeyRef.current = null;
      setEditPriceRow(null);
      setEditPf(null);
    }
  }, [planId, modalKind]);

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planId) return;
    try {
      await updatePlan.mutateAsync({ name: eName, description: eDesc || undefined, status: eStatus });
      toast('Plan updated');
      onClose();
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleUpdatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPriceRow) return;
    const account = accounts.data?.find((a) => a.id === epAccountId);
    try {
      await updatePrice.mutateAsync({
        planPriceId: editPriceRow.id,
        providerAccountId: epAccountId,
        provider: epProvider || account?.provider,
        externalPriceId: epExtId,
        externalVariantId: epVariantId.trim() || null,
        currency: epCurrency,
        unitAmountMinor: parseInt(epAmount, 10),
        billingInterval: epInterval,
        name: epDisplayName.trim() || null,
      });
      toast('Price updated');
      setEditPriceRow(null);
      onClose();
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleUpdatePlanFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPf) return;
    const feat = editPf.feature;
    try {
      let configValue: string | null = null;
      if (feat?.type === 'CONFIG') {
        try {
          if (feat.configType === 'ENUM') {
            configValue = epConfigValue || null;
          } else if (feat.configType === 'MONEY') {
            configValue = parseMoneyConfigInput(epMoneyAmount, epMoneyCurrency);
          } else {
            configValue = parseIntegerConfigInput(epConfigValue);
          }
        } catch (err) {
          toast(String(err), 'error');
          return;
        }
      }
      await updatePlanFeature.mutateAsync({
        planFeatureId: editPf.id,
        includedAmount: feat?.type === 'LIMIT' && epIncluded ? parseInt(epIncluded, 10) : null,
        softLimit: feat?.type === 'LIMIT' && epSoft ? parseInt(epSoft, 10) : null,
        hardLimit: feat?.type === 'LIMIT' && epHard ? parseInt(epHard, 10) : null,
        limitPeriod: feat?.type === 'LIMIT' && epResets ? epPeriod : null,
        tierMode: feat?.type === 'LIMIT' && epTierMode ? epTierMode : null,
        configValue,
      });
      toast('Plan feature updated');
      setEditPf(null);
      onClose();
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const editPricePreview = epAmount && epCurrency
    ? formatMinorUnits(parseInt(epAmount, 10) || 0, epCurrency)
    : null;

  if (!planId || !modalKind || !tenant) return null;

  if (plan.isLoading || !plan.data) {
    return (
      <Dialog open title="Loading…" onClose={onClose}>
        <p className="text-sm text-zinc-500">Loading plan…</p>
      </Dialog>
    );
  }

  return (
    <>
      <Dialog open={modalKind === 'plan'} onClose={onClose} title="Edit Plan">
        <form onSubmit={handleUpdatePlan} className="space-y-4">
          <Input label="Name" value={eName} onChange={(e) => setEName(e.currentTarget.value)} required autoFocus />
          <Textarea label="Description" value={eDesc} onChange={(e) => setEDesc(e.currentTarget.value)} />
          <Select
            label="Status"
            value={eStatus}
            onChange={(e) => setEStatus(e.currentTarget.value)}
            options={[
              { value: 'DRAFT', label: 'Draft' },
              { value: 'ACTIVE', label: 'Active' },
              { value: 'ARCHIVED', label: 'Archived (Retired)' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePlan.isPending}>{updatePlan.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={modalKind === 'price' && !!editPriceRow} onClose={() => { setEditPriceRow(null); onClose(); }} title="Edit provider price" className="max-w-lg">
        <form onSubmit={handleUpdatePrice} className="space-y-4">
          <Select
            label="Provider Account"
            value={epAccountId}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setEpAccountId(val);
              const acct = accounts.data?.find((a) => a.id === val);
              if (acct) setEpProvider(acct.provider);
            }}
            options={(accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.displayName} (${a.provider})` }))}
            placeholder="Select account"
            required
          />
          <Input label="External Price ID" value={epExtId} onChange={(e) => setEpExtId(e.currentTarget.value)} required placeholder="price_123" />
          <div>
            <Input
              label="External Variant ID"
              value={epVariantId}
              onChange={(e) => setEpVariantId(e.currentTarget.value)}
              placeholder="Optional — webhook matching"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Provider-specific id for the purchasable variant; webhooks use it to find this plan price.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Currency" value={epCurrency} onChange={(e) => setEpCurrency(e.currentTarget.value)} options={CURRENCIES} />
            <div>
              <Input label="Amount (pennies/cents)" type="number" value={epAmount} onChange={(e) => setEpAmount(e.currentTarget.value)} required placeholder="999" min="0" />
              {editPricePreview && <p className="mt-1 text-xs text-zinc-400">= <span className="font-mono text-emerald-400">{editPricePreview}</span></p>}
            </div>
          </div>
          <Select
            label="Billing Interval"
            value={epInterval}
            onChange={(e) => setEpInterval(e.currentTarget.value)}
            options={[
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
              { value: 'week', label: 'Weekly' },
              { value: 'day', label: 'Daily' },
            ]}
          />
          <Input label="Display Name (optional)" value={epDisplayName} onChange={(e) => setEpDisplayName(e.currentTarget.value)} placeholder="Pro Monthly" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditPriceRow(null); onClose(); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePrice.isPending}>{updatePrice.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={modalKind === 'planFeature' && !!editPf} onClose={() => { setEditPf(null); onClose(); }} title={`Edit: ${editPf?.feature?.name ?? ''}`}>
        <form onSubmit={handleUpdatePlanFeature} className="space-y-4">
          {editPf?.feature?.type === 'LIMIT' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Included" type="number" value={epIncluded} onChange={(e) => setEpIncluded(e.currentTarget.value)} placeholder="0" min="0" />
                <Input label="Soft Limit" type="number" value={epSoft} onChange={(e) => setEpSoft(e.currentTarget.value)} placeholder="(optional)" min="0" />
                <Input label="Hard Limit" type="number" value={epHard} onChange={(e) => setEpHard(e.currentTarget.value)} placeholder="(no cap)" min="0" />
              </div>
              <Select
                label="Limit Type"
                value={epResets ? 'resets' : 'constant'}
                onChange={(e) => setEpResets(e.currentTarget.value === 'resets')}
                options={[
                  { value: 'constant', label: 'Constant (never resets, e.g. max profiles)' },
                  { value: 'resets', label: 'Time-based (resets each period, e.g. monthly calls)' },
                ]}
              />
              {epResets && (
                <Select
                  label="Reset Period"
                  value={epPeriod}
                  onChange={(e) => setEpPeriod(e.currentTarget.value)}
                  options={[
                    { value: 'MONTH', label: 'Month' },
                    { value: 'YEAR', label: 'Year' },
                    { value: 'BILLING_PERIOD', label: 'Billing Period' },
                  ]}
                />
              )}
              <Select
                label="Tier Mode"
                value={epTierMode}
                onChange={(e) => setEpTierMode(e.currentTarget.value)}
                options={[
                  { value: '', label: 'None (no metering tiers)' },
                  { value: 'GRADUATED', label: 'Graduated' },
                  { value: 'VOLUME', label: 'Volume' },
                ]}
              />
            </>
          )}
          {editPf?.feature?.type === 'CONFIG' && (
            editPf.feature.configType === 'ENUM' && editPf.feature.configOptions?.length ? (
              <Select
                label="Config Value"
                value={epConfigValue}
                onChange={(e) => setEpConfigValue(e.currentTarget.value)}
                options={editPf.feature.configOptions.map((o) => ({ value: o, label: o }))}
              />
            ) : editPf.feature.configType === 'MONEY' ? (
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Currency"
                  value={epMoneyCurrency}
                  onChange={(e) => setEpMoneyCurrency(e.currentTarget.value)}
                  options={CURRENCIES}
                />
                <Input
                  label="Amount"
                  value={epMoneyAmount}
                  onChange={(e) => setEpMoneyAmount(e.currentTarget.value)}
                  placeholder="unlimited"
                />
              </div>
            ) : (
              <Input
                label="Config Value"
                value={epConfigValue}
                onChange={(e) => setEpConfigValue(e.currentTarget.value)}
                placeholder="unlimited"
              />
            )
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setEditPf(null); onClose(); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePlanFeature.isPending}>{updatePlanFeature.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>
    </>
  );
}
