import { openRouterService } from "@/server/services/openrouter-service";
import { workflowService } from "@/server/services/workflow-service";
import type { ChatEditInput, ChatEditResult } from "@/shared/dsl";

export const chatOrchestrator = {
  async editDsl(input: ChatEditInput): Promise<ChatEditResult> {
    const dsl = await openRouterService.editDsl(input);
    const validation = workflowService.validate(dsl);

    if (!validation.valid) {
      throw new Error(validation.issues[0]?.message ?? "Edited DSL is invalid");
    }

    return { dsl };
  }
};
