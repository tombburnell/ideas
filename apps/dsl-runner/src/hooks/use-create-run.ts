"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { CreateRunInput } from "@/shared/dsl";

export const useCreateRun = () =>
  useMutation({
    mutationFn: (input: CreateRunInput) => apiClient.createRun(input)
  });
