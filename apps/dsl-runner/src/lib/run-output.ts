import type { WorkflowStepRecord } from "@/shared/dsl";

/** Concatenate non-empty string fields from an LLM step output (typical markdown body). */
export const stringifyStepOutputForDisplay = (outputData: Record<string, unknown>): string => {
  const parts: string[] = [];
  for (const value of Object.values(outputData)) {
    if (typeof value === "string" && value.trim().length > 0) {
      parts.push(value.trim());
    }
  }
  return parts.join("\n\n");
};

/** Last completed LLM step output as display text (for markdown rendering). */
export const getLastLlmOutputText = (steps: WorkflowStepRecord[]): string | null => {
  for (let i = steps.length - 1; i >= 0; i -= 1) {
    const step = steps[i];
    if (step.stepType !== "llm" || step.status !== "completed") {
      continue;
    }
    const text = stringifyStepOutputForDisplay(step.outputData);
    if (text.length > 0) {
      return text;
    }
  }
  return null;
};
