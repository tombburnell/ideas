export type PrimitiveType = "string" | "number" | "boolean";

export type WorkflowModelKey = "fast" | "smart" | "reasoning";
export type WorkflowStepType = "llm" | "branch" | "parallel";
export type WorkflowRunStatus = "pending" | "running" | "completed" | "failed";
export type WorkflowStepStatus = "pending" | "running" | "completed" | "failed";

export interface WorkflowFieldDefinition {
  name: string;
  type: PrimitiveType;
}

export interface WorkflowFormDefinition {
  fields: WorkflowFieldDefinition[];
}

export interface WorkflowOutputDefinition {
  [key: string]: PrimitiveType;
}

export interface BaseWorkflowStep {
  id: string;
  type: WorkflowStepType;
}

export interface WorkflowLlmStep extends BaseWorkflowStep {
  type: "llm";
  prompt: string;
  input?: string;
  output: WorkflowOutputDefinition;
  model: WorkflowModelKey;
  tools?: string[];
}

export interface WorkflowBranchStep extends BaseWorkflowStep {
  type: "branch";
  condition: string;
  then: string;
  else: string;
}

export interface WorkflowParallelStep extends BaseWorkflowStep {
  type: "parallel";
  steps: string[];
}

export type WorkflowStepDefinition = WorkflowLlmStep | WorkflowBranchStep | WorkflowParallelStep;

export interface WorkflowDslDefinition {
  id: string;
  name: string;
  form: WorkflowFormDefinition;
  steps: WorkflowStepDefinition[];
}

export interface WorkflowRecord {
  id: string;
  workflowId: string;
  name: string;
  dsl: string;
  definition: WorkflowDslDefinition;
  createdAt: string;
  updatedAt: string;
}

export interface PromptRecord {
  id: string;
  promptId: string;
  name: string;
  template: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface SavePromptInput {
  promptId: string;
  template: string;
}

export interface WorkflowRunRecord {
  id: string;
  workflowRecordId: string;
  status: WorkflowRunStatus;
  formData: Record<string, string>;
  contextData: Record<string, unknown>;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface WorkflowStepRecord {
  id: string;
  runId: string;
  stepId: string;
  stepType: WorkflowStepType;
  status: WorkflowStepStatus;
  orderIndex: number;
  inputData: Record<string, unknown>;
  outputData: Record<string, unknown>;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkflowRunDetail extends WorkflowRunRecord {
  workflow: WorkflowRecord;
  steps: WorkflowStepRecord[];
}

export interface WorkflowReportSummary {
  runId: string;
  workflowId: string;
  workflowName: string;
  status: WorkflowRunStatus;
  createdAt: string;
  completedAt: string | null;
  preview: string | null;
}

export interface ValidationIssue {
  path: string;
  message: string;
  line: number;
  column: number;
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  definition: WorkflowDslDefinition | null;
}

export interface SaveWorkflowInput {
  workflowId: string;
  name: string;
  dsl: string;
}

export interface ChatEditInput {
  dsl: string;
  instruction: string;
}

export interface ChatEditResult {
  dsl: string;
}

export interface CreateRunInput {
  workflowId: string;
  formData: Record<string, string>;
}

export interface RunEvent {
  runId: string;
  status: WorkflowRunStatus;
  step: WorkflowStepRecord | null;
  errorMessage: string | null;
}

export interface WorkflowListResponse {
  workflows: WorkflowRecord[];
}

export interface PromptListResponse {
  prompts: PromptRecord[];
}

export interface SavePromptResponse {
  prompt: PromptRecord;
}

export interface WorkflowDetailResponse {
  workflow: WorkflowRecord;
}

export interface RunDetailResponse {
  run: WorkflowRunDetail;
}

export interface ValidationResponse {
  validation: ValidationResult;
}

export interface ReportListResponse {
  reports: WorkflowReportSummary[];
}
