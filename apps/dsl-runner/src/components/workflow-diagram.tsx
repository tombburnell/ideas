"use client";

import { useEffect, useId, useState } from "react";
import { buildWorkflowMermaid } from "@/lib/workflow-mermaid";

interface WorkflowDiagramProps {
  dsl: string;
}

export const WorkflowDiagram = ({ dsl }: WorkflowDiagramProps): React.ReactElement => {
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const diagramId = useId().replaceAll(":", "_");

  useEffect(() => {
    const chart = buildWorkflowMermaid(dsl);

    if (!chart) {
      setSvg(null);
      setError("Diagram unavailable while the DSL is invalid.");
      return;
    }

    let cancelled = false;

    const render = async (): Promise<void> => {
      try {
        const mermaidModule = await import("mermaid");
        mermaidModule.default.initialize({
          startOnLoad: false,
          theme: "dark"
        });

        const rendered = await mermaidModule.default.render(`workflow_diagram_${diagramId}`, chart);
        const compactSvg = rendered.svg.replace(
          "<svg ",
          '<svg style="max-width: 960px; width: 100%; height: auto; display: block; margin: 0 auto;" '
        );

        if (!cancelled) {
          setSvg(compactSvg);
          setError(null);
        }
      } catch (renderError) {
        if (!cancelled) {
          const message = renderError instanceof Error ? renderError.message : "Failed to render workflow diagram.";
          setSvg(null);
          setError(message);
        }
      }
    };

    void render();

    return () => {
      cancelled = true;
    };
  }, [diagramId, dsl]);

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-zinc-100">Workflow Diagram</h2>
        <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">Mermaid</span>
      </div>
      {svg ? (
        <div
          className="max-h-[280px] overflow-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-400">{error}</div>
      )}
    </section>
  );
};
