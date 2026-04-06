import { Queue } from "bullmq";
import IORedis from "ioredis";
import { appConfig } from "@/config/app-config";

const connection = new IORedis({
  host: appConfig.redis.host,
  port: appConfig.redis.port,
  maxRetriesPerRequest: null
});

export const workflowRunQueue = new Queue(appConfig.queue.runQueueName, {
  connection,
  defaultJobOptions: {
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false
  }
});

export const queueConnection = connection;
