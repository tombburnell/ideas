import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type Tab = { id: string; label: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (id: string) => void;
  children: ReactNode;
};

export function Tabs({ tabs, active, onChange, children }: Props) {
  return (
    <div>
      <div className="flex gap-1 border-b border-zinc-800">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              active === t.id
                ? 'border-b-2 border-white text-white'
                : 'text-zinc-500 hover:text-zinc-300',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="pt-6">{children}</div>
    </div>
  );
}
