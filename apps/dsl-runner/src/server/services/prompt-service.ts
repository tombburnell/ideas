import { promptRepo } from "@/server/repos/prompt-repo";
import type { PromptRecord } from "@/shared/dsl";

export const promptService = {
  async init(): Promise<void> {
    await promptRepo.ensureDefaults();
  },

  async list(): Promise<PromptRecord[]> {
    return promptRepo.list();
  },

  async get(promptId: string): Promise<PromptRecord | null> {
    return promptRepo.getByPromptId(promptId);
  }
};
