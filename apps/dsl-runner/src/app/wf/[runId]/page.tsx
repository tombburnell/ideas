"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { MarkdownBody } from "@/components/markdown-body";
import { RunEventTimeline } from "@/components/run-event-timeline";
import { useRunDetail } from "@/hooks/use-run-detail";
import { useRunStream } from "@/hooks/use-run-stream";
import { getLastLlmOutputText } from "@/lib/run-output";

const RunPage = (): React.ReactElement => {
  const params = useParams<{ runId: string }>();
  const runId = params.runId;
  const runQuery = useRunDetail(runId);
  const latestEvent = useRunStream(runId);

  if (runQuery.isLoading || !runQuery.data) {
    return <main className="p-8 text-zinc-200">Loading run...</main>;
  }

  const run = runQuery.data.run;
  const finalOutputText = getLastLlmOutputText(run.steps);

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <Link className="text-sm text-cyan-300 underline" href="/">
            Back to workflows
          </Link>
          <h1 className="mt-2 text-3xl font-semibold text-zinc-50">Run {run.id}</h1>
          <p className="mt-2 text-sm text-zinc-400">Latest event: {latestEvent?.status ?? run.status}</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          <p>Workflow: {run.workflow.name}</p>
          <p>Status: {run.status}</p>
        </div>
      </div>

      {finalOutputText ? (
        <section className="mb-8 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-xl shadow-zinc-950/20">
          <h2 className="mb-4 text-lg font-semibold text-zinc-100">Output</h2>
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-4">
            <MarkdownBody markdown={finalOutputText} />
          </div>
        </section>
      ) : null}

      <RunEventTimeline run={run} />
    </main>
  );
};

export default RunPage;
