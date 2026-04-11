import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useCustomers, useCreateCustomer } from '../hooks/use-admin';
import { DataTable } from '../components/ui/data-table';
import { Button } from '../components/ui/button';
import { Dialog } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { StatusBadge } from '../components/ui/badge';
import { useToast } from '../components/ui/toast';
import { SlugField } from '../components/slug-field';
import type { Customer } from '../lib/types';

export function CustomersPage() {
  const navigate = useNavigate();
  const customers = useCustomers();
  const create = useCreateCustomer();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await create.mutateAsync({ name, slug });
      toast('Customer created');
      setOpen(false);
      setName('');
      setSlug('');
    } catch (err) {
      toast(String(err), 'error');
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">Customers</h1>
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus size={14} /> New Customer
        </Button>
      </div>

      <DataTable<Customer>
        columns={[
          { key: 'name', header: 'Name', render: (r) => <span className="font-medium text-white">{r.name}</span> },
          { key: 'slug', header: 'Slug', render: (r) => <code className="text-xs text-zinc-500">{r.slug}</code> },
          { key: 'status', header: 'Status', render: (r) => <StatusBadge active={r.active} />, className: 'w-24' },
        ]}
        data={customers.data ?? []}
        keyFn={(r) => r.id}
        onRowClick={(r) => navigate(`/customers/${r.id}`)}
        isLoading={customers.isLoading}
        emptyMessage="No customers yet"
        emptyAction={
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            <Plus size={14} /> Create first customer
          </Button>
        }
      />

      <Dialog open={open} onClose={() => setOpen(false)} title="New Customer">
        <form onSubmit={handleCreate} className="space-y-4">
          <Input label="Name" value={name} onChange={(e) => setName(e.currentTarget.value)} required autoFocus />
          <SlugField
            label="Slug"
            title={name}
            value={slug}
            onChange={setSlug}
            takenValues={(customers.data ?? []).map((c) => c.slug)}
          />
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={create.isPending}>
              {create.isPending ? 'Creating…' : 'Create'}
            </Button>
          </div>
        </form>
      </Dialog>
    </div>
  );
}
