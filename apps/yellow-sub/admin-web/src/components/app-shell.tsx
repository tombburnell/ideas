import { useAuth } from '../lib/auth-context';
import { NavLink, Outlet } from 'react-router-dom';
import { clsx } from 'clsx';
import { Users, LogOut } from 'lucide-react';

const navItems = [{ to: '/', icon: Users, label: 'Customers' }];

export function AppShell() {
  const { signOutUser } = useAuth();

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 flex-col border-r border-zinc-800 bg-zinc-950">
        <div className="border-b border-zinc-800 px-5 py-4">
          <span className="text-sm font-semibold text-white">Yellow Sub</span>
        </div>
        <nav className="flex flex-1 flex-col gap-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200',
                )
              }
            >
              <item.icon size={16} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-zinc-800 p-3">
          <button
            type="button"
            onClick={() => void signOutUser()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto bg-zinc-950 p-6">
        <Outlet />
      </main>
    </div>
  );
}
