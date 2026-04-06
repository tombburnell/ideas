"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const useWorkflowValidation = () =>
  useMutation({
    mutationFn: (dsl: string) => apiClient.validateWorkflow(dsl)
  });
