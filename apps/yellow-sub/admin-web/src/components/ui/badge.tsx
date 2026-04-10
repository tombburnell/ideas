import { clsx } from 'clsx';

const colors = {
  green: 'bg-emerald-500/10 text-emerald-400 ring-emerald-500/20',
  red: 'bg-red-500/10 text-red-400 ring-red-500/20',
  yellow: 'bg-yellow-500/10 text-yellow-400 ring-yellow-500/20',
  blue: 'bg-blue-500/10 text-blue-400 ring-blue-500/20',
  zinc: 'bg-zinc-500/10 text-zinc-400 ring-zinc-500/20',
} as const;

type Props = { children: React.ReactNode; color?: keyof typeof colors; className?: string };

export function Badge({ children, color = 'zinc', className }: Props) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
        colors[color],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ active }: { active: boolean }) {
  return <Badge color={active ? 'green' : 'red'}>{active ? 'Active' : 'Inactive'}</Badge>;
}

const planStatusColors: Record<string, keyof typeof colors> = {
  DRAFT: 'yellow',
  ACTIVE: 'green',
  ARCHIVED: 'zinc',
};

export function PlanStatusBadge({ status }: { status: string }) {
  return <Badge color={planStatusColors[status] ?? 'zinc'}>{status}</Badge>;
}

const subStatusColors: Record<string, keyof typeof colors> = {
  ACTIVE: 'green',
  TRIALING: 'blue',
  PAST_DUE: 'yellow',
  CANCELED: 'red',
  EXPIRED: 'red',
  PAUSED: 'zinc',
  INCOMPLETE: 'yellow',
};

export function SubStatusBadge({ status }: { status: string }) {
  return <Badge color={subStatusColors[status] ?? 'zinc'}>{status}</Badge>;
}
