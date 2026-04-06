"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export const reportKeys = {
  all: ["reports"] as const
};

export const useReports = () =>
  useQuery({
    queryKey: reportKeys.all,
    queryFn: apiClient.listReports
  });
