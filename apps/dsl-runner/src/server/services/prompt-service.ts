import { promptRepo } from "@/server/repos/prompt-repo";
import type { PromptRecord, SavePromptInput } from "@/shared/dsl";

const promptIdPattern = /^[a-zA-Z0-9._]+$/;

export const promptService = {
  async init(): Promise<void> {
    await promptRepo.ensureDefaults();
  },

  async list(): Promise<PromptRecord[]> {
    return promptRepo.list();
  },

  async get(promptId: string): Promise<PromptRecord | null> {
    return promptRepo.getByPromptId(promptId);
  },

  save(input: SavePromptInput): Promise<PromptRecord> {
    const promptId = input.promptId.trim();
    const template = input.template.trim();

    if (promptId.length === 0) {
      throw new Error("promptId is required");
    }

    if (!promptIdPattern.test(promptId)) {
      throw new Error("promptId may only contain letters, numbers, dots, and underscores");
    }

    if (template.length === 0) {
      throw new Error("Prompt text is required");
    }

    return promptRepo.upsertByPromptId(promptId, template);
  }
};
