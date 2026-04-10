import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Copy, Search, RefreshCw, Pencil, Trash2 } from 'lucide-react';
import {
  useCustomers,
  useTenants,
  useProviderAccounts,
  useCreateProviderAccount,
  useProductFamilies,
  useCreateProductFamily,
  useUpdateProductFamily,
  useDeleteProductFamily,
  usePlans,
  useCreatePlan,
  useDeletePlan,
  useFeatures,
  useCreateFeature,
  useUpdateFeature,
  useDeleteFeature,
  useApiKeys,
  useCreateApiKey,
  useExternalUsers,
  useSubscriptions,
  useResyncSubscription,
  useEvents,
} from '../hooks/use-admin';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { Tabs } from '../components/ui/tabs';
import { DataTable } from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input, Textarea } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { Badge, StatusBadge, PlanStatusBadge, SubStatusBadge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import type {
  BillingProviderAccount,
  ExternalUser,
  Feature,
  Plan,
  ProductFamily,
  ProviderEventLog,
  Subscription,
  TenantApiKey,
} from '../lib/types';

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'products', label: 'Products & Plans' },
  { id: 'features', label: 'Features' },
  { id: 'api-keys', label: 'API Keys' },
  { id: 'subscribers', label: 'Subscribers' },
  { id: 'subscriptions', label: 'Subscriptions' },
  { id: 'events', label: 'Events' },
];

export function TenantDetailPage() {
  const { id: customerId, tenantId } = useParams<{ id: string; tenantId: string }>();
  const [tab, setTab] = useState('overview');

  const customers = useCustomers();
  const customer = customers.data?.find((c) => c.id === customerId);
  const tenants = useTenants(customerId!);
  const tenant = tenants.data?.find((t) => t.id === tenantId);

  if (customers.isLoading || tenants.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!customer || !tenant) return <p className="text-sm text-red-400">Not found</p>;

  return (
    <div className="space-y-6">
      <Breadcrumb
        items={[
          { label: 'Customers', to: '/' },
          { label: customer.name, to: `/customers/${customerId}` },
          { label: tenant.name },
        ]}
      />
      <div>
        <h1 className="text-lg font-semibold text-white">{tenant.name}</h1>
        <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
          <code>{tenant.slug}</code>
          <span>{tenant.defaultCurrency}</span>
          <StatusBadge active={tenant.active} />
        </div>
      </div>
      <Tabs tabs={TABS} active={tab} onChange={setTab}>
        {tab === 'overview' && <OverviewTab tenantId={tenantId!} />}
        {tab === 'products' && <ProductsTab customerId={customerId!} tenantId={tenantId!} />}
        {tab === 'features' && <FeaturesTab tenantId={tenantId!} />}
        {tab === 'api-keys' && <ApiKeysTab tenantId={tenantId!} />}
        {tab === 'subscribers' && <SubscribersTab tenantId={tenantId!} />}
        {tab === 'subscriptions' && <SubscriptionsTab tenantId={tenantId!} />}
        {tab === 'events' && <EventsTab tenantId={tenantId!} />}
      </Tabs>
    </div>
  );
}

// ── Overview Tab ──

function OverviewTab({ tenantId }: { tenantId: string }) {
  const accounts = useProviderAccounts(tenantId);
  const createAccount = useCreateProviderAccount(tenantId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [provider, setProvider] = useState('LEMON_SQUEEZY');
  const [displayName, setDisplayName] = useState('');
  const [accountRef, setAccountRef] = useState('');
  const [apiKey, setApiKey] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createAccount.mutateAsync({
        provider,
        displayName,
        accountRef,
        credentials: { apiKey },
      });
      toast('Provider account created');
      setOpen(false);
      setDisplayName('');
      setAccountRef('');
      setApiKey('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Billing Provider Accounts</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add Provider
        </Button>
      </div>
      <DataTable<BillingProviderAccount>
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.displayName}</span> },
          { key: 'provider', header: 'Provider', render: (r) => <Badge>{r.provider}</Badge> },
          { key: 'ref', header: 'Account Ref', render: (r) => <code className="text-xs text-zinc-500">{r.accountRef}</code> },
          { key: 'default', header: 'Default', render: (r) => (r.isDefault ? <Badge color="blue">Default</Badge> : null), className: 'w-24' },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
        ]}
        data={accounts.data ?? []}
        keyFn={(r) => r.id}
        isLoading={accounts.isLoading}
        emptyMessage="No provider accounts"
      />

      <Dialog open={open} onClose={() => setOpen(false)} title="Add Billing Provider">
        <form onSubmit={handleCreate} className="space-y-4">
          <Select
            label="Provider"
            value={provider}
            onChange={(e) => setProvider(e.currentTarget.value)}
            options={[
              { value: 'LEMON_SQUEEZY', label: 'Lemon Squeezy' },
              { value: 'STRIPE', label: 'Stripe' },
              { value: 'PAYPAL', label: 'PayPal' },
            ]}
          />
          <Input label="Display Name" value={displayName} onChange={(e) => setDisplayName(e.currentTarget.value)} required />
          <Input label="Account Ref" value={accountRef} onChange={(e) => setAccountRef(e.currentTarget.value)} required placeholder="store_123" />
          <Input label="API Key" type="password" value={apiKey} onChange={(e) => setApiKey(e.currentTarget.value)} required />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createAccount.isPending}>{createAccount.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}

// ── Products & Plans Tab ──

function ProductsTab({ customerId, tenantId }: { customerId: string; tenantId: string }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const families = useProductFamilies(tenantId);
  const plans = usePlans(tenantId);
  const createFamily = useCreateProductFamily(tenantId);
  const updateFamily = useUpdateProductFamily(tenantId);
  const deleteFamily = useDeleteProductFamily(tenantId);
  const createPlan = useCreatePlan(tenantId);
  const deletePlan = useDeletePlan(tenantId);

  const [familyOpen, setFamilyOpen] = useState(false);
  const [fKey, setFKey] = useState('');
  const [fName, setFName] = useState('');
  const [fDesc, setFDesc] = useState('');

  const [editFamily, setEditFamily] = useState<ProductFamily | null>(null);
  const [efName, setEfName] = useState('');
  const [efDesc, setEfDesc] = useState('');
  const [efActive, setEfActive] = useState(true);

  const [planOpen, setPlanOpen] = useState(false);
  const [pFamilyId, setPFamilyId] = useState('');
  const [pKey, setPKey] = useState('');
  const [pName, setPName] = useState('');
  const [pDesc, setPDesc] = useState('');

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFamily.mutateAsync({ key: fKey, name: fName, description: fDesc || undefined });
      toast('Product family created');
      setFamilyOpen(false);
      setFKey('');
      setFName('');
      setFDesc('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const openEditFamily = (f: ProductFamily) => {
    setEditFamily(f);
    setEfName(f.name);
    setEfDesc(f.description ?? '');
    setEfActive(f.active);
  };

  const handleUpdateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFamily) return;
    try {
      await updateFamily.mutateAsync({
        id: editFamily.id,
        name: efName,
        description: efDesc || undefined,
        active: efActive,
      });
      toast('Product family updated');
      setEditFamily(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleDeleteFamily = async (f: ProductFamily) => {
    if (!confirm(`Delete product family "${f.name}"? This only works if it has no plans.`)) return;
    try {
      await deleteFamily.mutateAsync(f.id);
      toast('Product family deleted');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleDeletePlan = async (p: Plan) => {
    if (!confirm(`Delete plan "${p.name}"? This only works if it has no subscriptions.`)) return;
    try {
      await deletePlan.mutateAsync(p.id);
      toast('Plan deleted');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createPlan.mutateAsync({
        productFamilyId: pFamilyId,
        key: pKey,
        name: pName,
        description: pDesc || undefined,
      });
      toast('Plan created');
      setPlanOpen(false);
      setPFamilyId('');
      setPKey('');
      setPName('');
      setPDesc('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Product Families</h2>
          <Button size="sm" variant="secondary" onClick={() => setFamilyOpen(true)}>
            <Plus size={14} /> Add Family
          </Button>
        </div>
        <DataTable<ProductFamily>
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
            { key: 'key', header: 'Key', render: (r) => <code className="text-xs text-zinc-500">{r.key}</code> },
            { key: 'desc', header: 'Description', render: (r) => <span className="text-zinc-400">{r.description ?? '—'}</span> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEditFamily(r); }}><Pencil size={14} /></Button>
                  <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeleteFamily(r); }}><Trash2 size={14} /></Button>
                </div>
              ),
              className: 'w-24',
            },
          ]}
          data={families.data ?? []}
          keyFn={(r) => r.id}
          isLoading={families.isLoading}
          emptyMessage="No product families"
        />
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Plans</h2>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => setPlanOpen(true)}
            disabled={!families.data?.length}
          >
            <Plus size={14} /> Add Plan
          </Button>
        </div>
        <DataTable<Plan>
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
            { key: 'key', header: 'Key', render: (r) => <code className="text-xs text-zinc-500">{r.key}</code> },
            { key: 'family', header: 'Family', render: (r) => r.productFamily?.name ?? '—' },
            { key: 'status', header: 'Status', render: (r) => <PlanStatusBadge status={r.status} />, className: 'w-24' },
            {
              key: 'actions',
              header: '',
              render: (r) => (
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDeletePlan(r); }}>
                  <Trash2 size={14} />
                </Button>
              ),
              className: 'w-16',
            },
          ]}
          data={plans.data ?? []}
          keyFn={(r) => r.id}
          onRowClick={(r) => navigate(`/customers/${customerId}/tenants/${tenantId}/plans/${r.id}`)}
          isLoading={plans.isLoading}
          emptyMessage="No plans"
        />
      </section>

      {/* Create Family */}
      <Dialog open={familyOpen} onClose={() => setFamilyOpen(false)} title="New Product Family">
        <form onSubmit={handleCreateFamily} className="space-y-4">
          <Input label="Name" value={fName} onChange={(e) => setFName(e.currentTarget.value)} required autoFocus />
          <Input label="Key" value={fKey} onChange={(e) => setFKey(e.currentTarget.value)} required pattern="[a-z0-9_-]+" placeholder="my-product" />
          <Textarea label="Description" value={fDesc} onChange={(e) => setFDesc(e.currentTarget.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setFamilyOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createFamily.isPending}>{createFamily.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Family */}
      <Dialog open={!!editFamily} onClose={() => setEditFamily(null)} title="Edit Product Family">
        <form onSubmit={handleUpdateFamily} className="space-y-4">
          <Input label="Name" value={efName} onChange={(e) => setEfName(e.currentTarget.value)} required autoFocus />
          <Textarea label="Description" value={efDesc} onChange={(e) => setEfDesc(e.currentTarget.value)} />
          <Select
            label="Status"
            value={efActive ? 'active' : 'inactive'}
            onChange={(e) => setEfActive(e.currentTarget.value === 'active')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive (Retired)' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditFamily(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updateFamily.isPending}>{updateFamily.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Create Plan */}
      <Dialog open={planOpen} onClose={() => setPlanOpen(false)} title="New Plan">
        <form onSubmit={handleCreatePlan} className="space-y-4">
          <Select
            label="Product Family"
            value={pFamilyId}
            onChange={(e) => setPFamilyId(e.currentTarget.value)}
            options={(families.data ?? []).map((f) => ({ value: f.id, label: f.name }))}
            placeholder="Select family"
          />
          <Input label="Name" value={pName} onChange={(e) => setPName(e.currentTarget.value)} required />
          <Input label="Key" value={pKey} onChange={(e) => setPKey(e.currentTarget.value)} required pattern="[a-z0-9_-]+" placeholder="pro-monthly" />
          <Textarea label="Description" value={pDesc} onChange={(e) => setPDesc(e.currentTarget.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setPlanOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createPlan.isPending}>{createPlan.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}

// ── Features Tab ──

function FeaturesTab({ tenantId }: { tenantId: string }) {
  const features = useFeatures(tenantId);
  const createFeature = useCreateFeature(tenantId);
  const updateFeature = useUpdateFeature(tenantId);
  const deleteFeature = useDeleteFeature(tenantId);
  const { toast } = useToast();

  const [open, setOpen] = useState(false);
  const [key, setKey] = useState('');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [type, setType] = useState<'BOOLEAN' | 'LIMIT' | 'CONFIG'>('BOOLEAN');
  const [unitLabel, setUnitLabel] = useState('');
  const [configType, setConfigType] = useState<'INTEGER' | 'ENUM'>('INTEGER');
  const [configOptions, setConfigOptions] = useState('');

  const [editFeature, setEditFeature] = useState<Feature | null>(null);
  const [eName, setEName] = useState('');
  const [eDesc, setEDesc] = useState('');
  const [eActive, setEActive] = useState(true);
  const [eType, setEType] = useState<'BOOLEAN' | 'LIMIT' | 'CONFIG'>('BOOLEAN');
  const [eUnitLabel, setEUnitLabel] = useState('');
  const [eConfigType, setEConfigType] = useState<'INTEGER' | 'ENUM'>('INTEGER');
  const [eConfigOptions, setEConfigOptions] = useState('');

  const resetCreate = () => {
    setKey(''); setName(''); setDesc('');
    setType('BOOLEAN'); setUnitLabel('');
    setConfigType('INTEGER'); setConfigOptions('');
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createFeature.mutateAsync({
        key, name, description: desc || undefined,
        type,
        unitLabel: type === 'LIMIT' ? unitLabel || undefined : undefined,
        configType: type === 'CONFIG' ? configType : undefined,
        configOptions: type === 'CONFIG' && configType === 'ENUM'
          ? configOptions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      toast('Feature created');
      setOpen(false);
      resetCreate();
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const openEdit = (f: Feature) => {
    setEditFeature(f);
    setEName(f.name);
    setEDesc(f.description ?? '');
    setEActive(f.active);
    setEType(f.type ?? 'BOOLEAN');
    setEUnitLabel(f.unitLabel ?? '');
    setEConfigType(f.configType ?? 'INTEGER');
    setEConfigOptions(Array.isArray(f.configOptions) ? f.configOptions.join(', ') : '');
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFeature) return;
    try {
      await updateFeature.mutateAsync({
        id: editFeature.id,
        name: eName,
        description: eDesc || undefined,
        active: eActive,
        type: eType,
        unitLabel: eType === 'LIMIT' ? eUnitLabel || undefined : undefined,
        configType: eType === 'CONFIG' ? eConfigType : undefined,
        configOptions: eType === 'CONFIG' && eConfigType === 'ENUM'
          ? eConfigOptions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
      });
      toast('Feature updated');
      setEditFeature(null);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleDelete = async (f: Feature) => {
    if (!confirm(`Delete feature "${f.name}"? This only works if it's not linked to any plans.`)) return;
    try {
      await deleteFeature.mutateAsync(f.id);
      toast('Feature deleted');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const typeLabel = (f: Feature) => {
    if (f.type === 'LIMIT') return f.unitLabel ? `Limit (${f.unitLabel})` : 'Limit';
    if (f.type === 'CONFIG') return f.configType === 'ENUM' ? 'Config (Enum)' : 'Config (Integer)';
    return 'Boolean';
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">Features</h2>
        <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
          <Plus size={14} /> Add Feature
        </Button>
      </div>
      <DataTable<Feature>
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
          { key: 'key', header: 'Key', render: (r) => <code className="text-xs text-zinc-500">{r.key}</code> },
          { key: 'type', header: 'Type', render: (r) => <Badge>{typeLabel(r)}</Badge> },
          { key: 'desc', header: 'Description', render: (r) => <span className="text-zinc-400">{r.description ?? '—'}</span> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <div className="flex gap-1">
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); openEdit(r); }}><Pencil size={14} /></Button>
                <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleDelete(r); }}><Trash2 size={14} /></Button>
              </div>
            ),
            className: 'w-24',
          },
        ]}
        data={features.data ?? []}
        keyFn={(r) => r.id}
        isLoading={features.isLoading}
        emptyMessage="No features"
      />

      {/* Create Feature */}
      <Dialog open={open} onClose={() => setOpen(false)} title="New Feature">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required autoFocus />
          <Input label="Key" value={key} onChange={(e) => setKey(e.currentTarget.value)} required pattern="[a-z0-9_-]+" placeholder="advanced-analytics" />
          <Select
            label="Type"
            value={type}
            onChange={(e) => setType(e.currentTarget.value as 'BOOLEAN' | 'LIMIT' | 'CONFIG')}
            options={[
              { value: 'BOOLEAN', label: 'Boolean (on/off)' },
              { value: 'LIMIT', label: 'Limit (quantified)' },
              { value: 'CONFIG', label: 'Configuration (value per plan)' },
            ]}
          />
          {type === 'LIMIT' && (
            <Input label="Unit Label" value={unitLabel} onChange={(e) => setUnitLabel(e.currentTarget.value)} placeholder="API calls, profiles, GB" />
          )}
          {type === 'CONFIG' && (
            <>
              <Select
                label="Config Type"
                value={configType}
                onChange={(e) => setConfigType(e.currentTarget.value as 'INTEGER' | 'ENUM')}
                options={[
                  { value: 'INTEGER', label: 'Integer' },
                  { value: 'ENUM', label: 'Enum (list of options)' },
                ]}
              />
              {configType === 'ENUM' && (
                <Input label="Options (comma-separated)" value={configOptions} onChange={(e) => setConfigOptions(e.currentTarget.value)} placeholder="email, chat, phone" />
              )}
            </>
          )}
          <Textarea label="Description" value={desc} onChange={(e) => setDesc(e.currentTarget.value)} />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createFeature.isPending}>{createFeature.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Edit Feature */}
      <Dialog open={!!editFeature} onClose={() => setEditFeature(null)} title="Edit Feature">
        <form onSubmit={handleUpdate} className="space-y-4">
          {editFeature && (
            <div className="rounded-md bg-zinc-900 px-3 py-2">
              <span className="text-xs text-zinc-500">Key: </span>
              <code className="text-xs text-zinc-300">{editFeature.key}</code>
            </div>
          )}
          <Input label="Name" value={eName} onChange={(e) => setEName(e.currentTarget.value)} required autoFocus />
          <Select
            label="Type"
            value={eType}
            onChange={(e) => setEType(e.currentTarget.value as 'BOOLEAN' | 'LIMIT' | 'CONFIG')}
            options={[
              { value: 'BOOLEAN', label: 'Boolean (on/off)' },
              { value: 'LIMIT', label: 'Limit (quantified)' },
              { value: 'CONFIG', label: 'Configuration (value per plan)' },
            ]}
          />
          {eType === 'LIMIT' && (
            <Input label="Unit Label" value={eUnitLabel} onChange={(e) => setEUnitLabel(e.currentTarget.value)} placeholder="API calls, profiles, GB" />
          )}
          {eType === 'CONFIG' && (
            <>
              <Select
                label="Config Type"
                value={eConfigType}
                onChange={(e) => setEConfigType(e.currentTarget.value as 'INTEGER' | 'ENUM')}
                options={[
                  { value: 'INTEGER', label: 'Integer' },
                  { value: 'ENUM', label: 'Enum (list of options)' },
                ]}
              />
              {eConfigType === 'ENUM' && (
                <Input label="Options (comma-separated)" value={eConfigOptions} onChange={(e) => setEConfigOptions(e.currentTarget.value)} placeholder="email, chat, phone" />
              )}
            </>
          )}
          <Textarea label="Description" value={eDesc} onChange={(e) => setEDesc(e.currentTarget.value)} />
          <Select
            label="Status"
            value={eActive ? 'active' : 'inactive'}
            onChange={(e) => setEActive(e.currentTarget.value === 'active')}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive (Retired)' },
            ]}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditFeature(null)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={updateFeature.isPending}>{updateFeature.isPending ? 'Saving…' : 'Save'}</Button>
          </div>
        </form>
      </Dialog>
    </section>
  );
}

// ── API Keys Tab ──

function ApiKeysTab({ tenantId }: { tenantId: string }) {
  const keys = useApiKeys(tenantId);
  const createKey = useCreateApiKey(tenantId);
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [newKey, setNewKey] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await createKey.mutateAsync({ name });
      setNewKey(result.apiKey);
      setName('');
      toast('API key created');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const copyKey = async () => {
    if (newKey) {
      await navigator.clipboard.writeText(newKey);
      toast('Copied to clipboard');
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-medium text-zinc-300">API Keys</h2>
        <Button size="sm" variant="secondary" onClick={() => { setOpen(true); setNewKey(null); }}>
          <Plus size={14} /> Create Key
        </Button>
      </div>
      <DataTable<TenantApiKey>
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
          { key: 'prefix', header: 'Prefix', render: (r) => <code className="text-xs text-zinc-500">{r.keyPrefix}…</code> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
          { key: 'lastUsed', header: 'Last Used', render: (r) => <span className="text-zinc-500">{r.lastUsedAt ? new Date(r.lastUsedAt).toLocaleDateString() : 'Never'}</span> },
          { key: 'created', header: 'Created', render: (r) => <span className="text-zinc-500">{new Date(r.createdAt).toLocaleDateString()}</span> },
        ]}
        data={keys.data ?? []}
        keyFn={(r) => r.id}
        isLoading={keys.isLoading}
        emptyMessage="No API keys"
      />

      <Dialog open={open} onClose={() => setOpen(false)} title={newKey ? 'API Key Created' : 'Create API Key'}>
        {newKey ? (
          <div className="space-y-4">
            <p className="text-xs text-yellow-400">Copy this key now. It will not be shown again.</p>
            <div className="flex items-center gap-2 rounded-md bg-zinc-900 p-3">
              <code className="flex-1 break-all text-xs text-emerald-400">{newKey}</code>
              <button type="button" onClick={copyKey} className="text-zinc-400 hover:text-white">
                <Copy size={14} />
              </button>
            </div>
            <div className="flex justify-end">
              <Button size="sm" variant="secondary" onClick={() => setOpen(false)}>Done</Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <Input label="Key Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required autoFocus placeholder="Production key" />
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={createKey.isPending}>{createKey.isPending ? 'Creating…' : 'Create'}</Button>
            </div>
          </form>
        )}
      </Dialog>
    </section>
  );
}

// ── Subscribers Tab ──

function SubscribersTab({ tenantId }: { tenantId: string }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const users = useExternalUsers(tenantId, query);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setQuery(search);
  };

  return (
    <section>
      <form onSubmit={handleSearch} className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            className="w-full rounded-md border border-zinc-800 bg-zinc-900 py-2 pl-9 pr-3 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none"
            placeholder="Search by email or user ID…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button type="submit" size="sm" variant="secondary">Search</Button>
      </form>
      <DataTable<ExternalUser>
        columns={[
          { key: 'email', header: 'Email', render: (r) => <span className="text-white">{r.email ?? '—'}</span> },
          { key: 'extId', header: 'External ID', render: (r) => <code className="text-xs text-zinc-500">{r.externalUserId}</code> },
          { key: 'name', header: 'Display Name', render: (r) => r.displayName ?? '—' },
          { key: 'lastSeen', header: 'Last Seen', render: (r) => <span className="text-zinc-500">{new Date(r.lastSeenAt).toLocaleDateString()}</span> },
        ]}
        data={users.data ?? []}
        keyFn={(r) => r.id}
        isLoading={users.isLoading}
        emptyMessage="No subscribers"
      />
    </section>
  );
}

// ── Subscriptions Tab ──

function SubscriptionsTab({ tenantId }: { tenantId: string }) {
  const subs = useSubscriptions(tenantId);
  const resync = useResyncSubscription();
  const { toast } = useToast();

  const handleResync = async (subId: string) => {
    try {
      await resync.mutateAsync(subId);
      toast('Resync queued');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  return (
    <section>
      <DataTable<Subscription>
        columns={[
          { key: 'user', header: 'User', render: (r) => <span className="text-white">{r.externalUser?.email ?? r.externalUserIdRef}</span> },
          { key: 'plan', header: 'Plan', render: (r) => r.plan?.name ?? r.planId },
          { key: 'status', header: 'Status', render: (r) => <SubStatusBadge status={r.status} />, className: 'w-28' },
          {
            key: 'period',
            header: 'Current Period',
            render: (r) =>
              r.currentPeriodStart && r.currentPeriodEnd
                ? `${new Date(r.currentPeriodStart).toLocaleDateString()} – ${new Date(r.currentPeriodEnd).toLocaleDateString()}`
                : '—',
          },
          {
            key: 'actions',
            header: '',
            render: (r) => (
              <Button size="sm" variant="ghost" onClick={() => handleResync(r.id)} disabled={resync.isPending}>
                <RefreshCw size={14} />
              </Button>
            ),
            className: 'w-16',
          },
        ]}
        data={subs.data ?? []}
        keyFn={(r) => r.id}
        isLoading={subs.isLoading}
        emptyMessage="No subscriptions"
      />
    </section>
  );
}

// ── Events Tab ──

function EventsTab({ tenantId }: { tenantId: string }) {
  const events = useEvents(tenantId);

  return (
    <section>
      <DataTable<ProviderEventLog>
        columns={[
          { key: 'type', header: 'Event Type', render: (r) => <span className="text-white">{r.eventType}</span> },
          { key: 'provider', header: 'Provider', render: (r) => <Badge>{r.provider}</Badge> },
          { key: 'status', header: 'Status', render: (r) => <Badge color={r.status === 'processed' ? 'green' : r.status === 'failed' ? 'red' : 'yellow'}>{r.status}</Badge> },
          { key: 'error', header: 'Error', render: (r) => r.errorMessage ? <span className="text-xs text-red-400">{r.errorMessage}</span> : '—' },
          { key: 'created', header: 'Created', render: (r) => <span className="text-zinc-500">{new Date(r.createdAt).toLocaleString()}</span> },
        ]}
        data={events.data ?? []}
        keyFn={(r) => r.id}
        isLoading={events.isLoading}
        emptyMessage="No events"
      />
    </section>
  );
}
