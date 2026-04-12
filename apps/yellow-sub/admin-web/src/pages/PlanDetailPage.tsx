import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, Check } from 'lucide-react';
import {
  useCustomers,
  useTenants,
  usePlan,
  useUpdatePlan,
  useFeatures,
  useProviderAccounts,
  useCreatePlanPrice,
  useUpdatePlanPrice,
  useLinkPlanFeature,
  useUpdatePlanFeature,
  useUnlinkPlanFeature,
  useUpsertTiers,
} from '../hooks/use-admin';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { DataTable } from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input, Textarea } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge, PlanStatusBadge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { CURRENCIES, formatMinorUnits } from '../lib/currency';
import { slugifyFromTitle } from '../lib/slug';
import type { PlanFeature, PlanPrice, MeteringTier } from '../lib/types';

export function PlanDetailPage() {
  const { id: customerId, tenantId, planId } = useParams<{
    id: string;
    tenantId: string;
    planId: string;
  }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const customers = useCustomers();
  const customer = customers.data?.find((c) => c.id === customerId);
  const tenants = useTenants(customerId!);
  const tenant = tenants.data?.find((t) => t.id === tenantId);
  const plan = usePlan(planId!);
  const updatePlan = useUpdatePlan(planId!);
  const features = useFeatures(tenantId!, plan.data?.productFamilyId, {
    enabledWhenFamilyMissing: false,
  });
  const accounts = useProviderAccounts(tenantId!);
  const createPrice = useCreatePlanPrice(tenantId!, planId!);
  const updatePrice = useUpdatePlanPrice(planId!);
  const linkFeature = useLinkPlanFeature(tenantId!, planId!);
  const updatePlanFeature = useUpdatePlanFeature(planId!);
  const unlinkPlanFeature = useUnlinkPlanFeature(planId!);
  const upsertTiers = useUpsertTiers(planId!);

  const [editOpen, setEditOpen] = useState(false);
  const [eName, setEName] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eStatus, setEStatus] = useState('DRAFT');

  const [priceOpen, setPriceOpen] = useState(false);
  const [priceAccountId, setPriceAccountId] = useState('');
  const [priceProvider, setPriceProvider] = useState('');
  const [priceExtId, setPriceExtId] = useState('');
  const [priceVariantId, setPriceVariantId] = useState('');
  const [priceCurrency, setPriceCurrency] = useState('');
  const [priceAmount, setPriceAmount] = useState('');
  const [priceInterval, setPriceInterval] = useState('month');
  const [priceName, setPriceName] = useState('');

  const [editPriceRow, setEditPriceRow] = useState<PlanPrice | null>(null);
  const [epAccountId, setEpAccountId] = useState('');
  const [epProvider, setEpProvider] = useState('');
  const [epExtId, setEpExtId] = useState('');
  const [epVariantId, setEpVariantId] = useState('');
  const [epCurrency, setEpCurrency] = useState('');
  const [epAmount, setEpAmount] = useState('');
  const [epInterval, setEpInterval] = useState('month');
  const [epDisplayName, setEpDisplayName] = useState('');

  const [featureOpen, setFeatureOpen] = useState(false);
  const [featureId, setFeatureId] = useState('');
  const [lfIncluded, setLfIncluded] = useState('');
  const [lfSoft, setLfSoft] = useState('');
  const [lfHard, setLfHard] = useState('');
  const [lfPeriod, setLfPeriod] = useState('MONTH');
  const [lfResets, setLfResets] = useState(false);
  const [lfTierMode, setLfTierMode] = useState('');
  const [lfConfigValue, setLfConfigValue] = useState('');

  const [editPf, setEditPf] = useState<PlanFeature | null>(null);
  const [epIncluded, setEpIncluded] = useState('');
  const [epSoft, setEpSoft] = useState('');
  const [epHard, setEpHard] = useState('');
  const [epPeriod, setEpPeriod] = useState('MONTH');
  const [epResets, setEpResets] = useState(false);
  const [epTierMode, setEpTierMode] = useState('');
  const [epConfigValue, setEpConfigValue] = useState('');

  const [tierPf, setTierPf] = useState<PlanFeature | null>(null);
  const [tierRows, setTierRows] = useState<{ fromUnit: string; toUnit: string; unitPriceMinor: string; flatFeeMinor: string; currency: string }[]>([]);

  const [expandedPf, setExpandedPf] = useState<string | null>(null);

  if (customers.isLoading || tenants.isLoading || plan.isLoading) {
    return <p className="text-sm text-zinc-500">Loading…</p>;
  }
  if (!customer || !tenant || !plan.data) {
    return <p className="text-sm text-red-400">Not found</p>;
  }

  const p = plan.data;
  const linkedFeatureIds = new Set(p.features.map((f) => f.featureId));
  const unlinkedFeatures = (features.data ?? []).filter((f) => !linkedFeatureIds.has(f.id));
  const selectedFeature = features.data?.find((f) => f.id === featureId);

  const openEditPlan = () => {
    setEName(p.name);
    setEDesc(p.description ?? '');
    setEStatus(p.status);
    setEditOpen(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePlan.mutateAsync({ name: eName, description: eDesc || undefined, status: eStatus });
      toast('Plan updated');
      setEditOpen(false);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const openPriceDialog = () => {
    setPriceCurrency(tenant.defaultCurrency);
    setPriceAccountId(accounts.data?.[0]?.id ?? '');
    const first = accounts.data?.[0];
    if (first) setPriceProvider(first.provider);
    setPriceOpen(true);
  };

  const openEditPrice = (row: PlanPrice) => {
    setEditPriceRow(row);
    setEpAccountId(row.providerAccountId);
    setEpProvider(row.provider);
    setEpExtId(row.externalPriceId);
    setEpVariantId(row.externalVariantId ?? '');
    setEpCurrency(row.currency);
    setEpAmount(row.unitAmountMinor.toString());
    setEpInterval(row.billingInterval);
    setEpDisplayName(row.name ?? '');
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
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleCreatePrice = async (e: React.FormEvent) => {
    e.preventDefault();
    const account = accounts.data?.find((a) => a.id === priceAccountId);
    try {
      await createPrice.mutateAsync({
        providerAccountId: priceAccountId,
        provider: priceProvider || account?.provider || 'LEMON_SQUEEZY',
        externalPriceId: priceExtId,
        externalVariantId: priceVariantId || undefined,
        currency: priceCurrency,
        unitAmountMinor: parseInt(priceAmount, 10),
        billingInterval: priceInterval,
        name: priceName || undefined,
      });
      toast('Price created');
      setPriceOpen(false);
      setPriceAccountId(''); setPriceExtId(''); setPriceVariantId('');
      setPriceAmount(''); setPriceInterval('month'); setPriceName('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const resetLinkForm = () => {
    setFeatureId(''); setLfIncluded(''); setLfSoft(''); setLfHard('');
    setLfPeriod('MONTH'); setLfResets(false); setLfTierMode(''); setLfConfigValue('');
  };

  const handleLinkFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    const feat = features.data?.find((f) => f.id === featureId);
    try {
      await linkFeature.mutateAsync({
        featureId,
        includedAmount: feat?.type === 'LIMIT' && lfIncluded ? parseInt(lfIncluded, 10) : undefined,
        softLimit: feat?.type === 'LIMIT' && lfSoft ? parseInt(lfSoft, 10) : undefined,
        hardLimit: feat?.type === 'LIMIT' && lfHard ? parseInt(lfHard, 10) : undefined,
        limitPeriod: feat?.type === 'LIMIT' && lfResets ? lfPeriod : undefined,
        tierMode: feat?.type === 'LIMIT' && lfTierMode ? lfTierMode : undefined,
        configValue: feat?.type === 'CONFIG' ? lfConfigValue : undefined,
      });
      toast('Feature linked');
      setFeatureOpen(false);
      resetLinkForm();
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const openEditPlanFeature = (pf: PlanFeature) => {
    setEditPf(pf);
    setEpIncluded(pf.includedAmount?.toString() ?? '');
    setEpSoft(pf.softLimit?.toString() ?? '');
    setEpHard(pf.hardLimit?.toString() ?? '');
    const hasReset = !!pf.limitPeriod && pf.limitPeriod !== 'LIFETIME';
    setEpResets(hasReset);
    setEpPeriod(hasReset ? pf.limitPeriod! : 'MONTH');
    setEpTierMode(pf.tierMode ?? '');
    setEpConfigValue(pf.configValue ?? '');
  };

  const handleUpdatePlanFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPf) return;
    const feat = editPf.feature;
    try {
      await updatePlanFeature.mutateAsync({
        planFeatureId: editPf.id,
        includedAmount: feat?.type === 'LIMIT' && epIncluded ? parseInt(epIncluded, 10) : null,
        softLimit: feat?.type === 'LIMIT' && epSoft ? parseInt(epSoft, 10) : null,
        hardLimit: feat?.type === 'LIMIT' && epHard ? parseInt(epHard, 10) : null,
        limitPeriod: feat?.type === 'LIMIT' && epResets ? epPeriod : null,
        tierMode: feat?.type === 'LIMIT' && epTierMode ? epTierMode : null,
        configValue: feat?.type === 'CONFIG' ? epConfigValue : null,
      });
      toast('Plan feature updated');
      setEditPf(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleUnlink = async (pf: PlanFeature) => {
    if (!confirm(`Unlink feature "${pf.feature?.name}"?`)) return;
    try {
      await unlinkPlanFeature.mutateAsync(pf.id);
      toast('Feature unlinked');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const openTierDialog = (pf: PlanFeature) => {
    setTierPf(pf);
    const existing = pf.tiers ?? [];
    if (existing.length) {
      setTierRows(existing.map((t) => ({
        fromUnit: t.fromUnit.toString(),
        toUnit: t.toUnit?.toString() ?? '',
        unitPriceMinor: t.unitPriceMinor.toString(),
        flatFeeMinor: t.flatFeeMinor.toString(),
        currency: t.currency,
      })));
    } else {
      setTierRows([{ fromUnit: '0', toUnit: '', unitPriceMinor: '', flatFeeMinor: '0', currency: tenant.defaultCurrency }]);
    }
  };

  const handleSaveTiers = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tierPf) return;
    try {
      await upsertTiers.mutateAsync({
        planFeatureId: tierPf.id,
        tiers: tierRows.map((r) => ({
          fromUnit: parseInt(r.fromUnit, 10),
          toUnit: r.toUnit ? parseInt(r.toUnit, 10) : null,
          unitPriceMinor: parseInt(r.unitPriceMinor, 10),
          flatFeeMinor: parseInt(r.flatFeeMinor, 10) || 0,
          currency: r.currency,
        })),
      });
      toast('Tiers saved');
      setTierPf(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const addTierRow = () => {
    const last = tierRows[tierRows.length - 1];
    const nextFrom = last?.toUnit ? (parseInt(last.toUnit, 10) + 1).toString() : '0';
    setTierRows([...tierRows, { fromUnit: nextFrom, toUnit: '', unitPriceMinor: '', flatFeeMinor: '0', currency: last?.currency ?? tenant.defaultCurrency }]);
  };

  const removeTierRow = (i: number) => {
    setTierRows(tierRows.filter((_, idx) => idx !== i));
  };

  const updateTierRow = (i: number, field: string, value: string) => {
    setTierRows(tierRows.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)));
  };

  const featureValueDisplay = (pf: PlanFeature) => {
    const feat = pf.feature;
    if (!feat) return '—';
    if (feat.type === 'BOOLEAN') return <Check size={14} className="text-emerald-400" />;
    if (feat.type === 'CONFIG') return <span className="text-zinc-200">{pf.configValue ?? '—'}</span>;
    const parts: string[] = [];
    if (pf.includedAmount != null) parts.push(`${pf.includedAmount.toLocaleString()} included`);
    if (pf.softLimit != null) parts.push(`warn ${pf.softLimit.toLocaleString()}`);
    if (pf.hardLimit != null) parts.push(`max ${pf.hardLimit.toLocaleString()}`);
    if (!parts.length) parts.push('unlimited');
    if (pf.limitPeriod && pf.limitPeriod !== 'LIFETIME') parts.push(`per ${pf.limitPeriod.toLowerCase().replace('_', ' ')}`);
    return <span className="text-zinc-200">{parts.join(' / ')}</span>;
  };

  const tierPreview = (tiers: MeteringTier[]) =>
    tiers.map((t) => {
      const range = t.toUnit != null ? `${t.fromUnit}-${t.toUnit}` : `${t.fromUnit}+`;
      const unit = formatMinorUnits(t.unitPriceMinor, t.currency);
      const flat = t.flatFeeMinor > 0 ? ` + ${formatMinorUnits(t.flatFeeMinor, t.currency)} flat` : '';
      return `${range}: ${unit}/unit${flat}`;
    }).join(', ');

  const pricePreview = priceAmount && priceCurrency
    ? formatMinorUnits(parseInt(priceAmount, 10) || 0, priceCurrency)
    : null;

  const editPricePreview = epAmount && epCurrency
    ? formatMinorUnits(parseInt(epAmount, 10) || 0, epCurrency)
    : null;

  const planSlug = slugifyFromTitle(p.name) || 'plan';
  const priceLabelExampleCreate = `${planSlug}_${priceInterval}`;
  const priceLabelExampleEdit = `${planSlug}_${epInterval}`;

  return (
    <div className="space-y-8">
      <Breadcrumb
        items={[
          { label: 'Customers', to: '/' },
          { label: customer.name, to: `/customers/${customerId}` },
          { label: tenant.name, to: `/customers/${customerId}/tenants/${tenantId}` },
          {
            label: 'Plans',
            to: `/customers/${customerId}/tenants/${tenantId}?tab=products`,
          },
          { label: p.name },
        ]}
      />

      <div className="mb-4">
        <Button
          size="sm"
          variant="ghost"
          className="text-zinc-400 hover:text-white"
          onClick={() =>
            navigate(`/customers/${customerId}/tenants/${tenantId}?tab=products`)
          }
        >
          ← Back to plans
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold text-white">{p.name}</h1>
            <PlanStatusBadge status={p.status} />
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
            <code>{p.key}</code>
            {p.productFamily && <span>in {p.productFamily.name}</span>}
          </div>
          {p.description && <p className="mt-2 text-sm text-zinc-400">{p.description}</p>}
        </div>
        <Button size="sm" variant="secondary" onClick={openEditPlan}>
          <Pencil size={14} /> Edit Plan
        </Button>
      </div>

      {/* Provider prices (linked to billing provider) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-zinc-300">Provider prices</h2>
            <p className="mt-0.5 text-xs text-zinc-500">
              Maps this plan to a price (and optional variant) in your payment provider for checkout and webhooks.
            </p>
          </div>
          <Button size="sm" variant="secondary" onClick={openPriceDialog} disabled={!accounts.data?.length}>
            <Plus size={14} /> Add price
          </Button>
        </div>
        {!accounts.data?.length && (
          <div className="mb-3 rounded-md border border-amber-600/40 bg-amber-950/20 px-3 py-2 text-xs text-amber-200/90">
            No billing provider account configured.{' '}
            <Link
              to={`/customers/${customerId}/tenants/${tenantId}?tab=providers`}
              className="font-medium text-emerald-400 underline-offset-2 hover:underline"
            >
              Add a provider
            </Link>{' '}
            before you can link prices.
          </div>
        )}
        <DataTable<PlanPrice>
          columns={[
            {
              key: 'name',
              header: 'Your label',
              render: (r) => <span className="text-white">{r.name ?? '—'}</span>,
            },
            { key: 'amount', header: 'Amount', render: (r) => <span className="font-mono text-white">{formatMinorUnits(r.unitAmountMinor, r.currency)}</span> },
            { key: 'interval', header: 'Interval', render: (r) => `/${r.billingInterval}` },
            { key: 'provider', header: 'Provider', render: (r) => <Badge>{r.provider}</Badge> },
            { key: 'extId', header: 'External Price ID', render: (r) => <code className="text-xs text-zinc-500">{r.externalPriceId}</code> },
            { key: 'trial', header: 'Trial', render: (r) => r.trialDays ? `${r.trialDays}d` : '—' },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button size="sm" variant="ghost" onClick={() => openEditPrice(r)}>
                  <Pencil size={14} />
                </Button>
              ),
              className: 'w-14',
            },
          ]}
          data={p.prices}
          keyFn={(r) => r.id}
          emptyMessage="No prices configured"
        />
      </section>

      {/* Features (unified — replaces old Features + Quotas sections) */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Features</h2>
          <Button size="sm" variant="secondary" onClick={() => setFeatureOpen(true)} disabled={unlinkedFeatures.length === 0}>
            <Plus size={14} /> Link Feature
          </Button>
        </div>
        <div className="overflow-hidden rounded-lg border border-zinc-800">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/50 text-left text-xs text-zinc-500">
                <th className="w-8 px-3 py-2" />
                <th className="px-3 py-2">Feature</th>
                <th className="px-3 py-2">Type</th>
                <th className="px-3 py-2">Value</th>
                <th className="px-3 py-2">Tiers</th>
                <th className="w-32 px-3 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {p.features.length === 0 && (
                <tr><td colSpan={6} className="px-3 py-6 text-center text-zinc-500">No features linked</td></tr>
              )}
              {p.features.map((pf) => {
                const feat = pf.feature;
                const hasTiers = (pf.tiers?.length ?? 0) > 0;
                const isExpanded = expandedPf === pf.id;
                return (
                  <tbody key={pf.id}>
                    <tr className="border-b border-zinc-800/50 hover:bg-zinc-900/30">
                      <td className="px-3 py-2">
                        {feat?.type === 'LIMIT' && (
                          <button type="button" onClick={() => setExpandedPf(isExpanded ? null : pf.id)} className="text-zinc-500 hover:text-white">
                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </button>
                        )}
                      </td>
                      <td className="px-3 py-2 text-white">{feat?.name ?? pf.featureId}</td>
                      <td className="px-3 py-2">
                        <Badge>
                          {feat?.type === 'LIMIT' ? (feat.unitLabel ?? 'Limit') : feat?.type === 'CONFIG' ? (feat.configType === 'ENUM' ? 'Enum' : 'Integer') : 'Boolean'}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">{featureValueDisplay(pf)}</td>
                      <td className="px-3 py-2">
                        {feat?.type === 'LIMIT' ? (
                          hasTiers ? (
                            <span className="text-xs text-zinc-400">
                              {pf.tiers!.length} tier{pf.tiers!.length > 1 ? 's' : ''} ({pf.tierMode ?? '—'})
                            </span>
                          ) : (
                            <span className="text-xs text-zinc-600">none</span>
                          )
                        ) : '—'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex gap-1">
                          {feat?.type !== 'BOOLEAN' && (
                            <Button size="sm" variant="ghost" onClick={() => openEditPlanFeature(pf)}><Pencil size={14} /></Button>
                          )}
                          {feat?.type === 'LIMIT' && (
                            <Button size="sm" variant="ghost" onClick={() => openTierDialog(pf)}>Tiers</Button>
                          )}
                          <Button size="sm" variant="ghost" onClick={() => handleUnlink(pf)}><Trash2 size={14} /></Button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && hasTiers && (
                      <tr className="bg-zinc-900/20">
                        <td />
                        <td colSpan={5} className="px-3 py-2">
                          <p className="mb-1 text-xs font-medium text-zinc-400">
                            Tier Mode: <Badge>{pf.tierMode ?? '—'}</Badge>
                          </p>
                          <p className="text-xs text-zinc-400">{tierPreview(pf.tiers!)}</p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Plan Dialog */}
      <Dialog open={editOpen} onClose={() => setEditOpen(false)} title="Edit Plan">
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
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePlan.isPending}>{updatePlan.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Price Dialog */}
      <Dialog open={priceOpen} onClose={() => setPriceOpen(false)} title="Add provider price">
        <form onSubmit={handleCreatePrice} className="space-y-4">
          <Select
            label="Provider Account"
            value={priceAccountId}
            onChange={(e) => {
              const val = e.currentTarget.value;
              setPriceAccountId(val);
              const acct = accounts.data?.find((a) => a.id === val);
              if (acct) setPriceProvider(acct.provider);
            }}
            options={(accounts.data ?? []).map((a) => ({ value: a.id, label: `${a.displayName} (${a.provider})` }))}
            placeholder="Select account"
            required
          />
          <Input label="External Price ID" value={priceExtId} onChange={(e) => setPriceExtId(e.currentTarget.value)} required placeholder="price_123" />
          <div>
            <Input
              label="External Variant ID"
              value={priceVariantId}
              onChange={(e) => setPriceVariantId(e.currentTarget.value)}
              placeholder="e.g. Lemon Squeezy variant id (optional)"
            />
            <p className="mt-1 text-xs text-zinc-500">
              Used to match incoming subscription webhooks to this plan (e.g. Lemon Squeezy reports a variant id per line item).
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Select label="Currency" value={priceCurrency} onChange={(e) => setPriceCurrency(e.currentTarget.value)} options={CURRENCIES} />
            <div>
              <Input label="Amount (pennies/cents)" type="number" value={priceAmount} onChange={(e) => setPriceAmount(e.currentTarget.value)} required placeholder="999" min="0" />
              {pricePreview && <p className="mt-1 text-xs text-zinc-400">= <span className="font-mono text-emerald-400">{pricePreview}</span></p>}
            </div>
          </div>
          <Select
            label="Billing Interval"
            value={priceInterval}
            onChange={(e) => setPriceInterval(e.currentTarget.value)}
            options={[
              { value: 'month', label: 'Monthly' },
              { value: 'year', label: 'Yearly' },
              { value: 'week', label: 'Weekly' },
              { value: 'day', label: 'Daily' },
            ]}
          />
          <div>
            <Input
              label="Your label for this price (optional)"
              value={priceName}
              onChange={(e) => setPriceName(e.currentTarget.value)}
              placeholder={priceLabelExampleCreate}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Pick a name you will recognise in admin and logs (not customer-facing). Example:{' '}
              <code className="text-zinc-400">{priceLabelExampleCreate}</code>
              {' '}— often <span className="font-mono text-zinc-400">{planSlug}</span> plus billing interval.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPriceOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createPrice.isPending}>{createPrice.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>

      <Dialog open={!!editPriceRow} onClose={() => setEditPriceRow(null)} title="Edit provider price" className="max-w-lg">
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
          <div>
            <Input
              label="Your label for this price (optional)"
              value={epDisplayName}
              onChange={(e) => setEpDisplayName(e.currentTarget.value)}
              placeholder={priceLabelExampleEdit}
            />
            <p className="mt-1 text-xs text-zinc-500">
              Pick a name you will recognise in admin and logs (not customer-facing). Example:{' '}
              <code className="text-zinc-400">{priceLabelExampleEdit}</code>
              .
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditPriceRow(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePrice.isPending}>{updatePrice.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Link Feature Dialog */}
      <Dialog open={featureOpen} onClose={() => { setFeatureOpen(false); resetLinkForm(); }} title="Link Feature">
        <form onSubmit={handleLinkFeature} className="space-y-4">
          <Select
            label="Feature"
            value={featureId}
            onChange={(e) => setFeatureId(e.currentTarget.value)}
            options={unlinkedFeatures.map((f) => ({ value: f.id, label: `${f.name} (${f.key}) — ${f.type}` }))}
            placeholder="Select feature"
            required
          />
          {selectedFeature?.type === 'LIMIT' && (
            <>
              <div className="grid grid-cols-3 gap-3">
                <Input label="Included" type="number" value={lfIncluded} onChange={(e) => setLfIncluded(e.currentTarget.value)} placeholder="0" min="0" />
                <Input label="Soft Limit" type="number" value={lfSoft} onChange={(e) => setLfSoft(e.currentTarget.value)} placeholder="(optional)" min="0" />
                <Input label="Hard Limit" type="number" value={lfHard} onChange={(e) => setLfHard(e.currentTarget.value)} placeholder="(no cap)" min="0" />
              </div>
              <Select
                label="Limit Type"
                value={lfResets ? 'resets' : 'constant'}
                onChange={(e) => setLfResets(e.currentTarget.value === 'resets')}
                options={[
                  { value: 'constant', label: 'Constant (never resets, e.g. max profiles)' },
                  { value: 'resets', label: 'Time-based (resets each period, e.g. monthly calls)' },
                ]}
              />
              {lfResets && (
                <Select
                  label="Reset Period"
                  value={lfPeriod}
                  onChange={(e) => setLfPeriod(e.currentTarget.value)}
                  options={[
                    { value: 'MONTH', label: 'Month' },
                    { value: 'YEAR', label: 'Year' },
                    { value: 'BILLING_PERIOD', label: 'Billing Period' },
                  ]}
                />
              )}
              <Select
                label="Tier Mode"
                value={lfTierMode}
                onChange={(e) => setLfTierMode(e.currentTarget.value)}
                options={[
                  { value: '', label: 'None (no metering tiers)' },
                  { value: 'GRADUATED', label: 'Graduated (each tier priced separately)' },
                  { value: 'VOLUME', label: 'Volume (all units at landing tier rate)' },
                ]}
              />
            </>
          )}
          {selectedFeature?.type === 'CONFIG' && (
            selectedFeature.configType === 'ENUM' && selectedFeature.configOptions?.length ? (
              <Select
                label="Config Value"
                value={lfConfigValue}
                onChange={(e) => setLfConfigValue(e.currentTarget.value)}
                options={selectedFeature.configOptions.map((o) => ({ value: o, label: o }))}
                placeholder="Select value"
                required
              />
            ) : (
              <Input label="Config Value" value={lfConfigValue} onChange={(e) => setLfConfigValue(e.currentTarget.value)} required placeholder="90" />
            )
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => { setFeatureOpen(false); resetLinkForm(); }}>Cancel</Button>
            <Button type="submit" size="sm" disabled={linkFeature.isPending}>{linkFeature.isPending ? 'Linking…' : 'Link'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Plan Feature Dialog */}
      <Dialog open={!!editPf} onClose={() => setEditPf(null)} title={`Edit: ${editPf?.feature?.name ?? ''}`}>
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
            ) : (
              <Input label="Config Value" value={epConfigValue} onChange={(e) => setEpConfigValue(e.currentTarget.value)} />
            )
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditPf(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updatePlanFeature.isPending}>{updatePlanFeature.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Tier Management Dialog */}
      <Dialog open={!!tierPf} onClose={() => setTierPf(null)} title={`Tiers: ${tierPf?.feature?.name ?? ''}`}>
        <form onSubmit={handleSaveTiers} className="space-y-4">
          <div className="space-y-2">
            {tierRows.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_1fr_1fr_80px_32px] gap-2 items-end">
                <Input label={i === 0 ? 'From' : undefined} type="number" value={row.fromUnit} onChange={(e) => updateTierRow(i, 'fromUnit', e.currentTarget.value)} min="0" />
                <Input label={i === 0 ? 'To' : undefined} type="number" value={row.toUnit} onChange={(e) => updateTierRow(i, 'toUnit', e.currentTarget.value)} placeholder="∞" />
                <Input label={i === 0 ? 'Unit Price' : undefined} type="number" value={row.unitPriceMinor} onChange={(e) => updateTierRow(i, 'unitPriceMinor', e.currentTarget.value)} placeholder="minor units" min="0" />
                <Input label={i === 0 ? 'Flat Fee' : undefined} type="number" value={row.flatFeeMinor} onChange={(e) => updateTierRow(i, 'flatFeeMinor', e.currentTarget.value)} placeholder="0" min="0" />
                <Select label={i === 0 ? 'Ccy' : undefined} value={row.currency} onChange={(e) => updateTierRow(i, 'currency', e.currentTarget.value)} options={CURRENCIES} />
                <Button type="button" size="sm" variant="ghost" onClick={() => removeTierRow(i)} disabled={tierRows.length <= 1}><Trash2 size={14} /></Button>
              </div>
            ))}
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={addTierRow}><Plus size={14} /> Add Tier</Button>
          {tierRows.length > 0 && (
            <p className="text-xs text-zinc-400">
              Preview: {tierRows.map((r) => {
                const range = r.toUnit ? `${r.fromUnit}-${r.toUnit}` : `${r.fromUnit}+`;
                const unit = r.unitPriceMinor ? formatMinorUnits(parseInt(r.unitPriceMinor, 10), r.currency) : '?';
                const flat = parseInt(r.flatFeeMinor, 10) > 0 ? ` + ${formatMinorUnits(parseInt(r.flatFeeMinor, 10), r.currency)} flat` : '';
                return `${range}: ${unit}/unit${flat}`;
              }).join(' | ')}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTierPf(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={upsertTiers.isPending}>{upsertTiers.isPending ? 'Saving…' : 'Save Tiers'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
