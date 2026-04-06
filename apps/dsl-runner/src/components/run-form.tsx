"use client";

import { useEffect, useMemo, useState } from "react";
import type { WorkflowRecord } from "@/shared/dsl";

interface RunFormProps {
  workflow: WorkflowRecord | null;
  isPending: boolean;
  onSubmit: (formData: Record<string, string>) => Promise<void>;
}

export const RunForm = ({ workflow, isPending, onSubmit }: RunFormProps): React.ReactElement => {
  const initialForm = useMemo(() => {
    const fields = workflow?.definition.form.fields ?? [];
    return Object.fromEntries(fields.map((field) => [field.name, ""])) as Record<string, string>;
  }, [workflow]);

  const [formData, setFormData] = useState<Record<string, string>>(initialForm);

  useEffect(() => {
    setFormData(initialForm);
  }, [initialForm]);

  if (!workflow) {
    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 text-zinc-400">
        Save a workflow to enable runs.
      </section>
    );
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
      <h2 className="mb-3 text-lg font-semibold text-zinc-100">Run Workflow</h2>
      <div className="space-y-3">
        {workflow.definition.form.fields.map((field) => (
          <label className="block" key={field.name}>
            <span className="mb-1 block text-sm text-zinc-400">{field.name}</span>
            <input
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 p-3 text-sm text-zinc-100 outline-none"
              onChange={(event) =>
                setFormData((current) => ({
                  ...current,
                  [field.name]: event.target.value
                }))
              }
              value={formData[field.name] ?? ""}
            />
          </label>
        ))}
      </div>
      <button
        className="mt-4 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={isPending}
        onClick={() => onSubmit(formData)}
        type="button"
      >
        {isPending ? "Starting..." : "Create Run"}
      </button>
    </section>
  );
};
