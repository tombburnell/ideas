import { openRouterService } from "@/server/services/openrouter-service";
import { workflowService } from "@/server/services/workflow-service";
import type { ChatEditInput, ChatEditResult } from "@/shared/dsl";

export const chatOrchestrator = {
  async editDsl(input: ChatEditInput): Promise<ChatEditResult> {
    console.info(`[chat] orchestrator request instruction=${JSON.stringify(input.instruction)}`);

    try {
      const dsl = await openRouterService.editDsl(input);
      const validation = workflowService.validate(dsl);

      if (!validation.valid) {
        const message = validation.issues[0]?.message ?? "Edited DSL is invalid";
        console.error(`[chat] orchestrator validation failure error=${message}`);
        throw new Error(message);
      }

      console.info(`[chat] orchestrator success instruction=${JSON.stringify(input.instruction)}`);

      return { dsl };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat edit failed";
      console.error(`[chat] orchestrator failure error=${message}`);
      throw error;
    }
  }
};
