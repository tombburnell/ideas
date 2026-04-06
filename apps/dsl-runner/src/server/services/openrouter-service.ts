import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject, generateText, tool } from "ai";
import { load } from "cheerio";
import { z } from "zod";
import { appConfig } from "@/config/app-config";
import type { WorkflowLlmStep, WorkflowModelKey } from "@/shared/dsl";

const openrouter = createOpenRouter({
  apiKey: appConfig.openRouter.apiKey,
  baseURL: appConfig.openRouter.baseUrl
});

const webSearchResultSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      snippet: z.string()
    })
  )
});

const createOutputSchema = (step: WorkflowLlmStep): z.ZodObject<Record<string, z.ZodTypeAny>> => {
  const shapeEntries = Object.entries(step.output).map(([key, valueType]) => {
    const schema = valueType === "string" ? z.string() : valueType === "number" ? z.number() : z.boolean();
    return [key, schema] as const;
  });

  return z.object(Object.fromEntries(shapeEntries));
};

const modelForKey = (modelKey: WorkflowModelKey) => openrouter(appConfig.openRouter.models[modelKey]);

const webSearchTool = tool({
  description: "Search the web for current information related to the workflow prompt.",
  inputSchema: z.object({
    query: z.string().min(3)
  }),
  execute: async ({ query }) => {
    const response = await fetch(`https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`);

    if (!response.ok) {
      throw new Error(`Web search failed with status ${response.status}`);
    }

    const html = await response.text();
    const document = load(html);
    const results = document(".result")
      .slice(0, 5)
      .map((_index, element) => {
        const anchor = document(element).find(".result__a").first();
        const snippet = document(element).find(".result__snippet").first().text().trim();

        return {
          title: anchor.text().trim(),
          url: anchor.attr("href") ?? "",
          snippet
        };
      })
      .get();

    return webSearchResultSchema.parse({ results });
  }
});

export const openRouterService = {
  async executeWorkflowStep(input: {
    step: WorkflowLlmStep;
    promptTemplate: string;
    contextData: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const prompt = input.promptTemplate.replace(/{{(.*?)}}/g, (_, key: string) => {
      const value = input.contextData[key.trim()];
      return typeof value === "string" ? value : JSON.stringify(value ?? "");
    });

    const response = await generateText({
      model: modelForKey(input.step.model),
      prompt: `${prompt}\n\nContext:\n${JSON.stringify(input.contextData, null, 2)}`,
      tools: input.step.tools?.includes("web_search") ? { web_search: webSearchTool } : undefined
    });

    const parsed = createOutputSchema(input.step).parse(JSON.parse(response.text));
    return parsed as Record<string, unknown>;
  },

  async editDsl(input: {
    dsl: string;
    instruction: string;
  }): Promise<string> {
    const response = await generateObject({
      model: modelForKey("smart"),
      schema: z.object({
        dsl: z.string().min(1)
      }),
      prompt: [
        "You edit workflow DSL written as YAML.",
        "Return only valid YAML in the dsl field.",
        "Do not add commentary.",
        "Instruction:",
        input.instruction,
        "Current DSL:",
        input.dsl
      ].join("\n")
    });

    return response.object.dsl;
  }
};
