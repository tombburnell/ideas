import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

const variants = {
  default: 'bg-white text-zinc-900 hover:bg-zinc-200',
  secondary: 'bg-zinc-800 text-zinc-100 hover:bg-zinc-700',
  ghost: 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100',
  destructive: 'bg-red-600 text-white hover:bg-red-700',
  outline: 'border border-zinc-700 text-zinc-300 hover:bg-zinc-800',
} as const;

const sizes = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-10 px-5 text-sm',
} as const;

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
};

export function Button({
  variant = 'default',
  size = 'md',
  className,
  ...props
}: Props) {
  return (
    <button
      {...props}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950',
        'disabled:pointer-events-none disabled:opacity-50',
        variants[variant],
        sizes[size],
        className,
      )}
    />
  );
}
