"use client";

import type { WorkflowRecord } from "@/shared/dsl";

interface WorkflowListProps {
  workflows: WorkflowRecord[];
  selectedWorkflowId: string;
  onSelect: (workflowId: string) => void;
}

export const WorkflowList = ({ workflows, selectedWorkflowId, onSelect }: WorkflowListProps): React.ReactElement => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
    <div className="mb-3 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-zinc-100">Workflows</h2>
      <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Persisted</span>
    </div>
    <div className="space-y-2">
      {workflows.map((workflow) => {
        const active = workflow.workflowId === selectedWorkflowId;

        return (
          <button
            key={workflow.id}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              active
                ? "border-cyan-400 bg-cyan-500/10 text-cyan-50"
                : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:border-zinc-700"
            }`}
            onClick={() => onSelect(workflow.workflowId)}
            type="button"
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{workflow.name}</p>
                <p className="text-sm text-zinc-500">{workflow.workflowId}</p>
              </div>
              <span className="text-xs text-cyan-300">Select</span>
            </div>
          </button>
        );
      })}
    </div>
  </section>
);
