"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const useRunDetail = (runId: string) =>
  useQuery({
    queryKey: ["runs", runId],
    queryFn: () => apiClient.getRun(runId),
    refetchInterval: 3000
  });
