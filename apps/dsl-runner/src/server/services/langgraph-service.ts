import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import type {
  WorkflowBranchStep,
  WorkflowDslDefinition,
  WorkflowLlmStep,
  WorkflowParallelStep,
  WorkflowStepDefinition
} from "@/shared/dsl";

const ExecutionPlanAnnotation = Annotation.Root({
  contextData: Annotation<Record<string, unknown>>({
    reducer: (current, next) => ({
      ...current,
      ...next
    }),
    default: () => ({})
  }),
  orderedSteps: Annotation<WorkflowStepDefinition[]>({
    reducer: (_current, next) => next,
    default: () => []
  })
});

const branchCondition = (branchStep: WorkflowBranchStep, contextData: Record<string, unknown>): string => {
  const evaluator = new Function("context", `return (${branchStep.condition});`) as (context: Record<string, unknown>) => boolean;
  return evaluator(contextData) ? branchStep.then : branchStep.else;
};

const topLevelSteps = (definition: WorkflowDslDefinition): WorkflowStepDefinition[] => {
  const nestedIds = new Set<string>();
  definition.steps.forEach((step) => {
    if (step.type === "parallel") {
      (step as WorkflowParallelStep).steps.forEach((stepId) => nestedIds.add(stepId));
    }
  });

  return definition.steps.filter((step) => !nestedIds.has(step.id));
};

const flattenExecutionOrder = (definition: WorkflowDslDefinition, contextData: Record<string, unknown>): WorkflowStepDefinition[] => {
  const stepMap = new Map(definition.steps.map((step) => [step.id, step]));
  const orderedSteps: WorkflowStepDefinition[] = [];

  const visitStep = (step: WorkflowStepDefinition): void => {
    if (step.type === "llm") {
      orderedSteps.push(step as WorkflowLlmStep);
      return;
    }

    if (step.type === "parallel") {
      const parallelStep = step as WorkflowParallelStep;
      for (const nestedStepId of parallelStep.steps) {
        const nestedStep = stepMap.get(nestedStepId);
        if (nestedStep) {
          visitStep(nestedStep);
        }
      }
      return;
    }

    const branchStep = step as WorkflowBranchStep;
    const targetStepId = branchCondition(branchStep, contextData);
    const targetStep = stepMap.get(targetStepId);
    if (targetStep) {
      visitStep(targetStep);
    }
  };

  for (const step of topLevelSteps(definition)) {
    visitStep(step);
  }

  return orderedSteps;
};

export const langGraphService = {
  async compileExecutionPlan(definition: WorkflowDslDefinition, contextData: Record<string, unknown>): Promise<WorkflowStepDefinition[]> {
    const graph = new StateGraph(ExecutionPlanAnnotation)
      .addNode("compile_plan", async (state: typeof ExecutionPlanAnnotation.State) => ({
      contextData: state.contextData,
      orderedSteps: flattenExecutionOrder(definition, state.contextData)
      }))
      .addEdge(START, "compile_plan")
      .addEdge("compile_plan", END);

    const compiled = graph.compile();
    const result = await compiled.invoke({
      contextData,
      orderedSteps: []
    });

    return result.orderedSteps;
  }
};
