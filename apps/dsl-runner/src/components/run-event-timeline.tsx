"use client";

import { useState } from "react";
import type { WorkflowRunDetail } from "@/shared/dsl";
import { DetailModal } from "@/components/detail-modal";

interface RunEventTimelineProps {
  run: WorkflowRunDetail;
}

interface ModalState {
  title: string;
  body: string;
}

const JsonBlock = ({
  label,
  value,
  onOpen
}: {
  label: string;
  value: Record<string, unknown>;
  onOpen: () => void;
}): React.ReactElement => (
  <button
    className="w-full rounded-lg border border-zinc-800 bg-zinc-900 p-3 text-left transition hover:border-zinc-600"
    type="button"
    onClick={onOpen}
  >
    <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</p>
    <pre className="max-h-32 overflow-hidden text-ellipsis whitespace-pre-wrap break-words text-xs text-zinc-300">
      {JSON.stringify(value, null, 2)}
    </pre>
    <p className="mt-2 text-xs text-cyan-400">Click to expand</p>
  </button>
);

const PromptBox = ({
  text,
  onOpen
}: {
  text: string | null;
  onOpen: () => void;
}): React.ReactElement | null => {
  if (!text || text.trim().length === 0) {
    return null;
  }

  const preview = text.length > 280 ? `${text.slice(0, 280)}…` : text;

  return (
    <button
      className="w-full rounded-lg border border-zinc-800 bg-zinc-950 p-3 text-left transition hover:border-zinc-600"
      type="button"
      onClick={onOpen}
    >
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-zinc-500">Prompt (interpolated)</p>
      <pre className="max-h-28 overflow-hidden whitespace-pre-wrap break-words font-mono text-xs leading-relaxed text-zinc-300">
        {preview}
      </pre>
      <p className="mt-2 text-xs text-cyan-400">Click to expand</p>
    </button>
  );
};

export const RunEventTimeline = ({ run }: RunEventTimelineProps): React.ReactElement => {
  const [modal, setModal] = useState<ModalState | null>(null);

  return (
    <>
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

              {step.stepType === "llm" && step.renderedPrompt ? (
                <div className="mb-3">
                  <PromptBox
                    text={step.renderedPrompt}
                    onOpen={() =>
                      setModal({
                        title: `Prompt — ${step.stepId}`,
                        body: step.renderedPrompt ?? ""
                      })
                    }
                  />
                </div>
              ) : null}

              <div className="grid gap-3 md:grid-cols-2">
                <JsonBlock
                  label="Input (context)"
                  value={step.inputData}
                  onOpen={() =>
                    setModal({
                      title: `Input — ${step.stepId}`,
                      body: JSON.stringify(step.inputData, null, 2)
                    })
                  }
                />
                <JsonBlock
                  label="Output"
                  value={step.outputData}
                  onOpen={() =>
                    setModal({
                      title: `Output — ${step.stepId}`,
                      body: JSON.stringify(step.outputData, null, 2)
                    })
                  }
                />
              </div>
              {step.errorMessage ? <p className="mt-3 text-sm text-rose-300">{step.errorMessage}</p> : null}
            </article>
          ))}
        </div>
      </section>

      {modal ? (
        <DetailModal title={modal.title} onClose={() => setModal(null)}>
          <pre className="whitespace-pre-wrap break-words font-mono text-sm leading-relaxed text-zinc-200">{modal.body}</pre>
        </DetailModal>
      ) : null}
    </>
  );
};
