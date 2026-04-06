"use client";

import { useMutation } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import type { ChatEditInput } from "@/shared/dsl";

export const useChatEdit = () =>
  useMutation({
    mutationFn: (input: ChatEditInput) => apiClient.chatEditWorkflow(input)
  });
