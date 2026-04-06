"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChatEditorPanel } from "@/components/chat-editor-panel";
import { DslEditor } from "@/components/dsl-editor";
import { RunForm } from "@/components/run-form";
import { WorkflowList } from "@/components/workflow-list";
import { useChatEdit } from "@/hooks/use-chat-edit";
import { useCreateRun } from "@/hooks/use-create-run";
import { usePrompts, useSaveWorkflow, useWorkflows } from "@/hooks/use-workflows";
import { useWorkflowValidation } from "@/hooks/use-workflow-validation";
import { defaultDsl } from "@/lib/default-dsl";

const HomePage = (): React.ReactElement => {
  const router = useRouter();
  const workflowsQuery = useWorkflows();
  const promptsQuery = usePrompts();
  const saveWorkflowMutation = useSaveWorkflow();
  const validateMutation = useWorkflowValidation();
  const chatEditMutation = useChatEdit();
  const createRunMutation = useCreateRun();

  const workflows = workflowsQuery.data?.workflows ?? [];
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<string>(workflows[0]?.workflowId ?? "example_workflow");
  const selectedWorkflow = useMemo(
    () => workflows.find((workflow) => workflow.workflowId === selectedWorkflowId) ?? null,
    [selectedWorkflowId, workflows]
  );
  const [workflowName, setWorkflowName] = useState<string>(selectedWorkflow?.name ?? "Example Workflow");
  const [dsl, setDsl] = useState<string>(selectedWorkflow?.dsl ?? defaultDsl);

  useEffect(() => {
    if (workflows.length === 0) {
      return;
    }

    if (!workflows.some((workflow) => workflow.workflowId === selectedWorkflowId)) {
      setSelectedWorkflowId(workflows[0].workflowId);
    }
  }, [selectedWorkflowId, workflows]);

  useEffect(() => {
    if (!selectedWorkflow) {
      return;
    }

    setWorkflowName(selectedWorkflow.name);
    setDsl(selectedWorkflow.dsl);
  }, [selectedWorkflow]);

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-6 py-8">
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.3em] text-cyan-400">DSL Runner</p>
          <h1 className="mt-2 text-4xl font-semibold text-zinc-50">Declarative LLM workflows with durable execution</h1>
          <p className="mt-3 max-w-3xl text-sm text-zinc-400">
            Build YAML workflows, refine them with AI, persist them to SQLite, execute them through BullMQ + LangGraph, and observe each step in real time.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-zinc-300">
          <p>{promptsQuery.data?.prompts.length ?? 0} prompts loaded</p>
          <p>{workflows.length} workflows persisted</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
        <div className="space-y-6">
          <WorkflowList
            workflows={workflows}
            selectedWorkflowId={selectedWorkflowId}
            onSelect={(workflowId) => {
              const workflow = workflows.find((item) => item.workflowId === workflowId) ?? null;
              setSelectedWorkflowId(workflowId);
              setWorkflowName(workflow?.name ?? workflowName);
              setDsl(workflow?.dsl ?? defaultDsl);
            }}
          />
          <RunForm
            workflow={selectedWorkflow}
            isPending={createRunMutation.isPending}
            onSubmit={async (formData) => {
              const run = await createRunMutation.mutateAsync({
                workflowId: selectedWorkflowId,
                formData
              });
              router.push(`/wf/${run.runId}`);
            }}
          />
          <ChatEditorPanel
            isPending={chatEditMutation.isPending}
            onSubmit={async (instruction) => {
              const result = await chatEditMutation.mutateAsync({ dsl, instruction });
              setDsl(result.dsl);
            }}
          />
        </div>

        <div className="space-y-6">
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl shadow-zinc-950/20">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto_auto]">
              <label>
                <span className="mb-1 block text-sm text-zinc-400">Workflow name</span>
                <input
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none"
                  onChange={(event) => setWorkflowName(event.target.value)}
                  value={workflowName}
                />
              </label>
              <button
                className="rounded-xl bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={validateMutation.isPending}
                onClick={async () => {
                  await validateMutation.mutateAsync(dsl);
                }}
                type="button"
              >
                {validateMutation.isPending ? "Validating..." : "Validate"}
              </button>
              <button
                className="rounded-xl bg-cyan-500 px-4 py-2 text-sm font-medium text-zinc-950 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={saveWorkflowMutation.isPending}
                onClick={async () => {
                  const validation = await validateMutation.mutateAsync(dsl);
                  if (!validation.validation.valid) {
                    return;
                  }
                  const saved = await saveWorkflowMutation.mutateAsync({
                    workflowId: selectedWorkflowId,
                    name: workflowName,
                    dsl
                  });
                  setSelectedWorkflowId(saved.workflow.workflowId);
                  setWorkflowName(saved.workflow.name);
                  setDsl(saved.workflow.dsl);
                }}
                type="button"
              >
                {saveWorkflowMutation.isPending ? "Saving..." : "Save Workflow"}
              </button>
            </div>
          </section>

          <DslEditor value={dsl} onChange={setDsl} validation={validateMutation.data?.validation ?? null} />
        </div>
      </div>
    </main>
  );
};

export default HomePage;
