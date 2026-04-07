"use client";

import { useEffect } from "react";

interface DetailModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

export const DetailModal = ({ title, onClose, children }: DetailModalProps): React.ReactElement => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="flex min-h-[80vh] min-w-[80vw] max-h-[90vh] flex-col overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-900 shadow-2xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-5 py-3">
          <h2 className="text-lg font-semibold text-zinc-100" id="detail-modal-title">
            {title}
          </h2>
          <button
            className="rounded-lg px-3 py-1 text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100"
            type="button"
            onClick={onClose}
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto p-5 text-zinc-200">{children}</div>
      </div>
    </div>
  );
};
