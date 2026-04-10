import { clsx } from 'clsx';
import type { ReactNode } from 'react';

type Column<T> = {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
};

type Props<T> = {
  columns: Column<T>[];
  data: T[];
  keyFn: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  emptyAction?: ReactNode;
};

export function DataTable<T>({
  columns,
  data,
  keyFn,
  onRowClick,
  isLoading,
  emptyMessage = 'No data',
  emptyAction,
}: Props<T>) {
  if (isLoading) {
    return (
      <div className="rounded-lg border border-zinc-800">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-4 border-b border-zinc-800/50 px-4 py-3 last:border-0">
            {columns.map((c) => (
              <div key={c.key} className="h-4 flex-1 animate-pulse rounded bg-zinc-800" />
            ))}
          </div>
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-800 py-12">
        <p className="text-sm text-zinc-500">{emptyMessage}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-zinc-800">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800 bg-zinc-900/50">
            {columns.map((c) => (
              <th
                key={c.key}
                className={clsx('px-4 py-2.5 text-left text-xs font-medium text-zinc-500', c.className)}
              >
                {c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyFn(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={clsx(
                'border-b border-zinc-800/50 last:border-0',
                onRowClick && 'cursor-pointer hover:bg-zinc-900/50',
              )}
            >
              {columns.map((c) => (
                <td key={c.key} className={clsx('px-4 py-3 text-zinc-300', c.className)}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
