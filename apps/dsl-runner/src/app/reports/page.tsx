"use client";

import Link from "next/link";
import { useReports } from "@/hooks/use-reports";

const ReportsPage = (): React.ReactElement => {
  const reportsQuery = useReports();
  const reports = reportsQuery.data?.reports ?? [];

  return (
    <main className="mx-auto min-h-screen max-w-6xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <Link className="text-sm text-cyan-300 underline" href="/">
            Back to workflows
          </Link>
          <h1 className="mt-2 text-4xl font-semibold text-zinc-50">Recent Reports</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            Completed workflow runs with quick previews and links to the full report timeline.
          </p>
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
        <div className="space-y-3">
          {reports.length === 0 ? <p className="text-sm text-zinc-400">No completed reports yet.</p> : null}
          {reports.map((report) => (
            <article className="rounded-xl border border-zinc-800 bg-zinc-950 p-4" key={report.runId}>
              <div className="mb-2 flex items-center justify-between gap-4">
                <div>
                  <h2 className="font-medium text-zinc-100">{report.workflowName}</h2>
                  <p className="text-sm text-zinc-500">{report.workflowId}</p>
                </div>
                <Link className="text-sm text-cyan-300 underline" href={`/wf/${report.runId}`}>
                  Open report
                </Link>
              </div>
              <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                {report.status} · Created {new Date(report.createdAt).toLocaleString()}
              </p>
              <p className="mt-3 text-sm text-zinc-300">{report.preview ?? "No preview available."}</p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
};

export default ReportsPage;
