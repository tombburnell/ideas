"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { SaveWorkflowInput } from "@/shared/dsl";

export const workflowKeys = {
  all: ["workflows"] as const,
  detail: (workflowId: string) => ["workflows", workflowId] as const,
  prompts: ["prompts"] as const
};

export const useWorkflows = () =>
  useQuery({
    queryKey: workflowKeys.all,
    queryFn: apiClient.listWorkflows
  });

export const usePrompts = () =>
  useQuery({
    queryKey: workflowKeys.prompts,
    queryFn: apiClient.listPrompts
  });

export const useSaveWorkflow = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SaveWorkflowInput) => apiClient.saveWorkflow(input),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.all });
      queryClient.setQueryData(workflowKeys.detail(result.workflow.workflowId), result);
    }
  });
};
