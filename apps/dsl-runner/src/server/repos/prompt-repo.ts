import { prisma } from "@/server/db/prisma";
import { serializePrompt } from "@/server/db/serializers";
import type { PromptRecord } from "@/shared/dsl";

const defaultPrompts = [
  {
    promptId: "clarify_goal",
    name: "Clarify Goal",
    template:
      "Clarify the user goal for topic '{{topic}}' aimed at '{{audience}}'. Respond as strict JSON matching the requested schema.",
    version: 1
  },
  {
    promptId: "classify_complexity",
    name: "Classify Complexity",
    template:
      "Given the workflow context, classify the task as simple or complex. Respond as strict JSON matching the requested schema.",
    version: 1
  },
  {
    promptId: "deep_analysis_prompt",
    name: "Deep Analysis",
    template:
      "Perform a deep analysis for '{{topic}}' intended for '{{audience}}'. Respond as strict JSON matching the requested schema.",
    version: 1
  },
  {
    promptId: "simple_analysis_prompt",
    name: "Simple Analysis",
    template:
      "Provide a concise analysis for '{{topic}}' intended for '{{audience}}'. Respond as strict JSON matching the requested schema.",
    version: 1
  },
  {
    promptId: "report_template_1",
    name: "Report Template 1",
    template:
      "Create report one for '{{topic}}' intended for '{{audience}}'. Use the web_search tool if needed. Respond as strict JSON matching the requested schema.",
    version: 1
  },
  {
    promptId: "report_template_2",
    name: "Report Template 2",
    template:
      "Create report two for '{{topic}}' intended for '{{audience}}'. Use the web_search tool if needed. Respond as strict JSON matching the requested schema.",
    version: 1
  }
] as const;

export const promptRepo = {
  async ensureDefaults(): Promise<void> {
    await Promise.all(
      defaultPrompts.map((prompt) =>
        prisma.prompt.upsert({
          where: {
            promptId: prompt.promptId
          },
          update: {
            name: prompt.name,
            template: prompt.template,
            version: prompt.version
          },
          create: prompt
        })
      )
    );
  },

  async list(): Promise<PromptRecord[]> {
    const prompts = await prisma.prompt.findMany({
      orderBy: {
        promptId: "asc"
      }
    });

    return prompts.map(serializePrompt);
  },

  async getByPromptId(promptId: string): Promise<PromptRecord | null> {
    const prompt = await prisma.prompt.findUnique({
      where: {
        promptId
      }
    });

    return prompt ? serializePrompt(prompt) : null;
  },

  async upsertByPromptId(promptId: string, template: string): Promise<PromptRecord> {
    const prompt = await prisma.prompt.upsert({
      where: { promptId },
      create: {
        promptId,
        name: "",
        template,
        version: 1
      },
      update: {
        template,
        version: { increment: 1 }
      }
    });

    return serializePrompt(prompt);
  }
};
