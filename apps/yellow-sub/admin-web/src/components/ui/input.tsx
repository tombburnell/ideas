import { clsx } from 'clsx';
import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };
type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string };

const inputClass =
  'w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-500 focus:border-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-600';

export function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-zinc-400">
          {label}
        </label>
      )}
      <input id={inputId} className={clsx(inputClass, error && 'border-red-500', className)} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

export function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-');
  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-medium text-zinc-400">
          {label}
        </label>
      )}
      <textarea id={inputId} className={clsx(inputClass, 'min-h-[80px]', error && 'border-red-500', className)} {...props} />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
