"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { PromptTemplateEditor } from "@/components/prompt-template-editor";
import { usePrompts } from "@/hooks/use-workflows";
import { useSavePrompt } from "@/hooks/use-prompts";
import type { PromptRecord } from "@/shared/dsl";

type Selection = "new" | { kind: "existing"; internalId: string };

const PromptsPage = (): React.ReactElement => {
  const promptsQuery = usePrompts();
  const saveMutation = useSavePrompt();

  const prompts = promptsQuery.data?.prompts ?? [];
  const isLoading = promptsQuery.isLoading;

  const [selection, setSelection] = useState<Selection>("new");
  const [draftPromptId, setDraftPromptId] = useState("");
  const [draftTemplate, setDraftTemplate] = useState("");
  const didInitialListSelect = useRef(false);

  const selectedPrompt = useMemo((): PromptRecord | null => {
    if (selection === "new") {
      return null;
    }
    return prompts.find((p) => p.id === selection.internalId) ?? null;
  }, [prompts, selection]);

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (prompts.length === 0) {
      didInitialListSelect.current = false;
      setSelection("new");
      setDraftPromptId("");
      setDraftTemplate("");
      return;
    }
    if (!didInitialListSelect.current) {
      didInitialListSelect.current = true;
      const first = prompts[0];
      setSelection({ kind: "existing", internalId: first.id });
      setDraftPromptId(first.promptId);
      setDraftTemplate(first.template);
      return;
    }
    if (selection === "new") {
      return;
    }
    const stillThere = prompts.some((p) => p.id === selection.internalId);
    if (!stillThere) {
      const first = prompts[0];
      setSelection({ kind: "existing", internalId: first.id });
      setDraftPromptId(first.promptId);
      setDraftTemplate(first.template);
    }
  }, [isLoading, prompts, selection]);

  useEffect(() => {
    if (selection === "new") {
      return;
    }
    const p = prompts.find((item) => item.id === selection.internalId);
    if (p) {
      setDraftPromptId(p.promptId);
      setDraftTemplate(p.template);
    }
  }, [prompts, selection]);

  const isNew = selection === "new";
  const internalIdDisplay = isNew ? "—" : selectedPrompt?.id ?? "—";

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">DSL Runner</p>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-50">Prompts</h1>
          <p className="mt-2 max-w-2xl text-sm text-zinc-400">
            Edit prompt templates stored in SQLite. Variables in <code className="text-cyan-300">{"{{ }}"}</code> style are highlighted.
          </p>
        </div>
        <Link className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-200 hover:border-zinc-600" href="/">
          ← Home
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="space-y-3">
          <button
            className="w-full rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 hover:bg-cyan-400"
            type="button"
            onClick={() => {
              setSelection("new");
              setDraftPromptId("");
              setDraftTemplate("");
            }}
          >
            Add prompt
          </button>
          <nav className="max-h-[70vh] space-y-1 overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-2">
            {prompts.map((p) => (
              <button
                key={p.id}
                className={`w-full rounded-lg px-3 py-2 text-left text-sm ${
                  selection !== "new" && selection.internalId === p.id
                    ? "bg-zinc-800 text-zinc-50"
                    : "text-zinc-400 hover:bg-zinc-800/80 hover:text-zinc-200"
                }`}
                type="button"
                onClick={() => {
                  setSelection({ kind: "existing", internalId: p.id });
                  setDraftPromptId(p.promptId);
                  setDraftTemplate(p.template);
                }}
              >
                <span className="font-mono text-cyan-300">{p.promptId}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm text-zinc-400">Prompt id</span>
              <input
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none disabled:opacity-70"
                disabled={!isNew}
                onChange={(e) => setDraftPromptId(e.target.value)}
                placeholder="e.g. my_prompt_1"
                value={draftPromptId}
              />
              {!isNew ? <p className="mt-1 text-xs text-zinc-500">Id cannot be changed after creation.</p> : null}
            </label>
            <label className="block">
              <span className="mb-1 block text-sm text-zinc-400">Internal id (read-only)</span>
              <input
                className="w-full cursor-not-allowed rounded-xl border border-zinc-800 bg-zinc-950/80 px-3 py-2 font-mono text-xs text-zinc-500"
                readOnly
                value={internalIdDisplay}
              />
            </label>
          </div>

          <div>
            <span className="mb-2 block text-sm text-zinc-400">Prompt text</span>
            <PromptTemplateEditor onChange={setDraftTemplate} value={draftTemplate} />
          </div>

          {saveMutation.isError ? (
            <p className="text-sm text-rose-400">{saveMutation.error instanceof Error ? saveMutation.error.message : "Save failed"}</p>
          ) : null}

          <button
            className="rounded-xl bg-cyan-500 px-5 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={saveMutation.isPending}
            type="button"
            onClick={async () => {
              const result = await saveMutation.mutateAsync({
                promptId: draftPromptId,
                template: draftTemplate
              });
              setSelection({ kind: "existing", internalId: result.prompt.id });
              setDraftPromptId(result.prompt.promptId);
              setDraftTemplate(result.prompt.template);
            }}
          >
            {saveMutation.isPending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </main>
  );
};

export default PromptsPage;
