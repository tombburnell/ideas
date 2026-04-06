import type {
  ChatEditInput,
  ChatEditResult,
  CreateRunInput,
  ReportListResponse,
  RunDetailResponse,
  ValidationResponse,
  WorkflowDetailResponse,
  WorkflowListResponse,
  PromptListResponse,
  SaveWorkflowInput
} from "@/shared/dsl";

const parseResponse = async <T>(response: Response): Promise<T> => {
  if (!response.ok) {
    const payload = (await response.json().catch(() => ({ error: "Request failed" }))) as { error?: string };
    throw new Error(payload.error ?? "Request failed");
  }

  return (await response.json()) as T;
};

const postJson = async <T>(path: string, body: unknown): Promise<T> => {
  const response = await fetch(path, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  return parseResponse<T>(response);
};

export const apiClient = {
  listWorkflows(): Promise<WorkflowListResponse> {
    return fetch("/api/workflows").then(parseResponse<WorkflowListResponse>);
  },

  getWorkflow(workflowId: string): Promise<WorkflowDetailResponse> {
    return fetch(`/api/workflows/${workflowId}`).then(parseResponse<WorkflowDetailResponse>);
  },

  listPrompts(): Promise<PromptListResponse> {
    return fetch("/api/prompts").then(parseResponse<PromptListResponse>);
  },

  validateWorkflow(dsl: string): Promise<ValidationResponse> {
    return postJson<ValidationResponse>("/api/workflows/validate", { dsl });
  },

  saveWorkflow(input: SaveWorkflowInput): Promise<WorkflowDetailResponse> {
    return postJson<WorkflowDetailResponse>("/api/workflows", input);
  },

  chatEditWorkflow(input: ChatEditInput): Promise<ChatEditResult> {
    return postJson<ChatEditResult>("/api/workflows/chat-edit", input);
  },

  createRun(input: CreateRunInput): Promise<{ runId: string }> {
    return postJson<{ runId: string }>("/api/runs", input);
  },

  listReports(): Promise<ReportListResponse> {
    return fetch("/api/reports").then(parseResponse<ReportListResponse>);
  },

  getRun(runId: string): Promise<RunDetailResponse> {
    return fetch(`/api/runs/${runId}`).then(parseResponse<RunDetailResponse>);
  }
};
