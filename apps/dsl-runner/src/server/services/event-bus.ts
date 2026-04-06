import { EventEmitter } from "node:events";
import type { RunEvent } from "@/shared/dsl";

class RunEventBus {
  private readonly emitter = new EventEmitter();

  subscribe(runId: string, listener: (event: RunEvent) => void): () => void {
    this.emitter.on(runId, listener);
    return () => {
      this.emitter.off(runId, listener);
    };
  }

  publish(event: RunEvent): void {
    this.emitter.emit(event.runId, event);
  }
}

export const runEventBus = new RunEventBus();
