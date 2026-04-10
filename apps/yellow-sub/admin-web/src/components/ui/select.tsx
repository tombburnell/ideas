import { clsx } from 'clsx';
import type { SelectHTMLAttributes } from 'react';

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
};

export function Select({ label, options, placeholder, className, id, ...props }: Props) {
  const selectId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-medium text-zinc-400">
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={clsx(
          'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100',
          'focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600',
          className,
        )}
        {...props}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
