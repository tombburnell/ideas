import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';
import { clsx } from 'clsx';
import { X } from 'lucide-react';

type ToastType = 'success' | 'error';
type Toast = { id: number; message: string; type: ToastType };

const Ctx = createContext<{
  toast: (message: string, type?: ToastType) => void;
} | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, type: ToastType = 'success') => {
    const id = nextId++;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4000);
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={clsx(
              'flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg',
              t.type === 'success' && 'border-emerald-800 bg-emerald-950 text-emerald-200',
              t.type === 'error' && 'border-red-800 bg-red-950 text-red-200',
            )}
          >
            <span className="flex-1">{t.message}</span>
            <button type="button" onClick={() => dismiss(t.id)} className="opacity-60 hover:opacity-100">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('ToastProvider required');
  return ctx;
}
