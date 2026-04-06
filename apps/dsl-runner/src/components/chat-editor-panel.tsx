"use client";

import { useState } from "react";

interface ChatEditorPanelProps {
  isPending: boolean;
  onSubmit: (instruction: string) => Promise<void>;
}

export const ChatEditorPanel = ({ isPending, onSubmit }: ChatEditorPanelProps): React.ReactElement => {
  const [instruction, setInstruction] = useState("");

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
      <h2 className="mb-3 text-lg font-semibold text-zinc-100">AI DSL Editor</h2>
      <textarea
        className="min-h-32 w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none placeholder:text-zinc-500"
        onChange={(event) => setInstruction(event.target.value)}
        placeholder="Describe the change you want to make to the workflow DSL"
        value={instruction}
      />
      <button
        className="mt-3 rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending || instruction.trim().length === 0}
        onClick={async () => {
          await onSubmit(instruction.trim());
          setInstruction("");
        }}
        type="button"
      >
        {isPending ? "Applying..." : "Apply with AI"}
      </button>
    </section>
  );
};
