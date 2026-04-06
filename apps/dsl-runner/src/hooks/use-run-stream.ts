"use client";

import { useEffect, useState } from "react";
import type { RunEvent } from "@/shared/dsl";
import { httpConfig } from "@/shared/http";

export const useRunStream = (runId: string): RunEvent | null => {
  const [event, setEvent] = useState<RunEvent | null>(null);

  useEffect(() => {
    const eventSource = new EventSource(`/api/workflows/${runId}/stream`);

    eventSource.onmessage = (message) => {
      const payload = JSON.parse(message.data) as RunEvent;
      setEvent(payload);
    };

    eventSource.onerror = () => {
      window.setTimeout(() => {
        eventSource.close();
      }, httpConfig.sseReconnectDelayMs);
    };

    return () => {
      eventSource.close();
    };
  }, [runId]);

  return event;
};
