import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus } from 'lucide-react';
import {
  useCustomers,
  useUpdateCustomer,
  useBrands,
  useCreateBrand,
  useTenants,
  useCreateTenant,
} from '../hooks/use-admin';
import { Breadcrumb } from '../components/ui/breadcrumb';
import { DataTable } from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Select } from '../components/ui/select';
import { StatusBadge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { CURRENCIES } from '../lib/currency';
import type { Brand, Tenant } from '../lib/types';

export function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const customers = useCustomers();
  const customer = customers.data?.find((c) => c.id === id);
  const update = useUpdateCustomer(id!);
  const brands = useBrands(id!);
  const createBrand = useCreateBrand();
  const tenants = useTenants(id!);
  const createTenant = useCreateTenant();

  const [brandOpen, setBrandOpen] = useState(false);
  const [brandName, setBrandName] = useState('');
  const [brandSlug, setBrandSlug] = useState('');

  const [tenantOpen, setTenantOpen] = useState(false);
  const [tenantName, setTenantName] = useState('');
  const [tenantSlug, setTenantSlug] = useState('');
  const [tenantCurrency, setTenantCurrency] = useState('GBP');
  const [tenantBrandId, setTenantBrandId] = useState('');

  if (customers.isLoading) return <p className="text-sm text-zinc-500">Loading…</p>;
  if (!customer) return <p className="text-sm text-red-400">Customer not found</p>;

  const handleToggleActive = async () => {
    try {
      await update.mutateAsync({ active: !customer.active });
      toast(`Customer ${customer.active ? 'deactivated' : 'activated'}`);
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleCreateBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createBrand.mutateAsync({ customerId: id!, name: brandName, slug: brandSlug });
      toast('Brand created');
      setBrandOpen(false);
      setBrandName('');
      setBrandSlug('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createTenant.mutateAsync({
        customerId: id!,
        name: tenantName,
        slug: tenantSlug,
        defaultCurrency: tenantCurrency,
        brandId: tenantBrandId || undefined,
      });
      toast('Tenant created');
      setTenantOpen(false);
      setTenantName('');
      setTenantSlug('');
      setTenantCurrency('GBP');
      setTenantBrandId('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  return (
    <div className="space-y-8">
      <Breadcrumb items={[{ label: 'Customers', to: '/' }, { label: customer.name }]} />

      <div className="flex items-center gap-4">
        <div>
          <h1 className="text-lg font-semibold text-white">{customer.name}</h1>
          <code className="text-xs text-zinc-500">{customer.slug}</code>
        </div>
        <StatusBadge active={customer.active} />
        <Button
          size="sm"
          variant={customer.active ? 'outline' : 'secondary'}
          onClick={handleToggleActive}
          disabled={update.isPending}
        >
          {customer.active ? 'Deactivate' : 'Activate'}
        </Button>
      </div>

      {/* Brands */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Brands</h2>
          <Button size="sm" variant="secondary" onClick={() => setBrandOpen(true)}>
            <Plus size={14} /> Add Brand
          </Button>
        </div>
        <DataTable<Brand>
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
            { key: 'slug', header: 'Slug', render: (r) => <code className="text-xs text-zinc-500">{r.slug}</code> },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
          ]}
          data={brands.data ?? []}
          keyFn={(r) => r.id}
          isLoading={brands.isLoading}
          emptyMessage="No brands"
        />
      </section>

      {/* Tenants */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-medium text-zinc-300">Tenants</h2>
          <Button size="sm" variant="secondary" onClick={() => setTenantOpen(true)}>
            <Plus size={14} /> Add Tenant
          </Button>
        </div>
        <DataTable<Tenant>
          columns={[
            { key: 'name', header: 'Name', render: (r) => <span className="text-white">{r.name}</span> },
            { key: 'slug', header: 'Slug', render: (r) => <code className="text-xs text-zinc-500">{r.slug}</code> },
            { key: 'currency', header: 'Currency', render: (r) => r.defaultCurrency },
            { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
          ]}
          data={tenants.data ?? []}
          keyFn={(r) => r.id}
          onRowClick={(r) => navigate(`/customers/${id}/tenants/${r.id}`)}
          isLoading={tenants.isLoading}
          emptyMessage="No tenants"
        />
      </section>

      {/* Brand Dialog */}
      <Dialog open={brandOpen} onClose={() => setBrandOpen(false)} title="New Brand">
        <form onSubmit={handleCreateBrand} className="space-y-4">
          <Input label="Name" value={brandName} onChange={(e) => setBrandName(e.currentTarget.value)} required autoFocus />
          <Input label="Slug" value={brandSlug} onChange={(e) => setBrandSlug(e.currentTarget.value)} required pattern="[a-z0-9-]+" placeholder="my-brand" />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setBrandOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createBrand.isPending}>{createBrand.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>

      {/* Tenant Dialog */}
      <Dialog open={tenantOpen} onClose={() => setTenantOpen(false)} title="New Tenant">
        <form onSubmit={handleCreateTenant} className="space-y-4">
          <Input label="Name" value={tenantName} onChange={(e) => setTenantName(e.currentTarget.value)} required autoFocus />
          <Input label="Slug" value={tenantSlug} onChange={(e) => setTenantSlug(e.currentTarget.value)} required pattern="[a-z0-9-]+" placeholder="my-app" />
          <Select
            label="Default Currency"
            value={tenantCurrency}
            onChange={(e) => setTenantCurrency(e.currentTarget.value)}
            options={CURRENCIES}
          />
          {brands.data && brands.data.length > 0 && (
            <Select
              label="Brand (optional)"
              value={tenantBrandId}
              onChange={(e) => setTenantBrandId(e.currentTarget.value)}
              options={brands.data.map((b) => ({ value: b.id, label: b.name }))}
              placeholder="None"
            />
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setTenantOpen(false)}>Cancel</Button>
            <Button type="submit" size="sm" disabled={createTenant.isPending}>{createTenant.isPending ? 'Creating…' : 'Create'}</Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
