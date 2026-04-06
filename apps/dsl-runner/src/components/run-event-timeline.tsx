"use client";

import type { WorkflowRunDetail } from "@/shared/dsl";

interface RunEventTimelineProps {
  run: WorkflowRunDetail;
}

export const RunEventTimeline = ({ run }: RunEventTimelineProps): JSX.Element => (
  <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
    <div className="mb-4 flex items-center justify-between">
      <h2 className="text-lg font-semibold text-zinc-100">Execution Timeline</h2>
      <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs uppercase tracking-[0.2em] text-zinc-300">{run.status}</span>
    </div>
    <div className="space-y-3">
      {run.steps.map((step) => (
        <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" key={step.id}>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <h3 className="font-medium text-zinc-100">{step.stepId}</h3>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">{step.stepType}</p>
            </div>
            <span className="text-sm text-zinc-300">{step.status}</span>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <pre className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">{JSON.stringify(step.inputData, null, 2)}</pre>
            <pre className="overflow-auto rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-xs text-zinc-300">{JSON.stringify(step.outputData, null, 2)}</pre>
          </div>
          {step.errorMessage ? <p className="mt-3 text-sm text-rose-300">{step.errorMessage}</p> : null}
        </article>
      ))}
    </div>
  </section>
);
