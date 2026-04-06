import { Worker } from "bullmq";
import { appConfig } from "@/config/app-config";
import { runOrchestrator } from "@/server/orchestrators/run-orchestrator";
import { queueConnection } from "@/server/services/queue-service";

interface WorkflowJobData {
  runId: string;
  workflowId: string;
}

export const workflowWorker = new Worker<WorkflowJobData>(
  appConfig.queue.runQueueName,
  async (job) => {
    await runOrchestrator.executeRun(job.data.runId);
  },
  {
    connection: queueConnection,
    concurrency: 1
  }
);
