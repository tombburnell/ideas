import { openRouterService } from "@/server/services/openrouter-service";
import { workflowService } from "@/server/services/workflow-service";
import type { ChatEditInput, ChatEditResult } from "@/shared/dsl";

export const chatOrchestrator = {
  async editDsl(input: ChatEditInput): Promise<ChatEditResult> {
    console.info(`[chat] orchestrator request instruction=${JSON.stringify(input.instruction)}`);

    let validationErrors: string[] = [];

    for (const attempt of [1, 2]) {
      try {
        const dsl = await openRouterService.editDsl({
          ...input,
          validationErrors,
          attempt
        });
        const validation = workflowService.validate(dsl);

        if (!validation.valid) {
          validationErrors = validation.issues.map((issue) => `${issue.path}: ${issue.message}`);
          const message = validationErrors.join("\n");
          console.error(`[chat] orchestrator validation failure attempt=${attempt} error=${message}`);

          if (attempt === 2) {
            throw new Error(message);
          }

          continue;
        }

        console.info(`[chat] orchestrator success instruction=${JSON.stringify(input.instruction)}`);

        return { dsl };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Chat edit failed";

        if (attempt === 2) {
          console.error(`[chat] orchestrator failure error=${message}`);
          throw error;
        }
      }
    }

    throw new Error("Chat edit failed");
  }
};
