import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth-context';
import { adminFetch } from '../lib/api';

type Customer = { id: string; name: string; slug: string; active: boolean };

export function ShellPage() {
  const { signOutUser, getIdToken } = useAuth();

  const customers = useQuery({
    queryKey: ['admin', 'customers'],
    queryFn: async () => {
      const token = await getIdToken();
      const res = await adminFetch('/api/v1/admin/customers', token);
      if (!res.ok) throw new Error(await res.text());
      return res.json() as Promise<Customer[]>;
    },
  });

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
        <span className="font-semibold text-white">Yellow Sub</span>
        <button
          type="button"
          onClick={() => void signOutUser()}
          className="text-sm text-zinc-400 hover:text-white"
        >
          Sign out
        </button>
      </header>
      <main className="p-6">
        <h2 className="text-lg font-medium text-white">Customers</h2>
        {customers.isLoading && (
          <p className="mt-4 text-sm text-zinc-500">Loading…</p>
        )}
        {customers.error && (
          <p className="mt-4 text-sm text-red-400">{String(customers.error)}</p>
        )}
        {customers.data && (
          <ul className="mt-4 divide-y divide-zinc-800 rounded-lg border border-zinc-800">
            {customers.data.map((c) => (
              <li key={c.id} className="flex items-center justify-between px-4 py-3">
                <span className="text-zinc-200">{c.name}</span>
                <code className="text-xs text-zinc-500">{c.slug}</code>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
