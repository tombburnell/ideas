"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { workflowKeys } from "@/hooks/use-workflows";
import { apiClient } from "@/lib/api-client";
import type { SavePromptInput } from "@/shared/dsl";

export const useSavePrompt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SavePromptInput) => apiClient.savePrompt(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: workflowKeys.prompts });
    }
  });
};
