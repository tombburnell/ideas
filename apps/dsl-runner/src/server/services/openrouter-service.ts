import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { generateObject } from "ai";
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

const buildSchemaInstruction = (step: WorkflowLlmStep): string => {
  const fields = Object.entries(step.output).map(([key, valueType]) => `${key}: ${valueType}`);
  return `Return exactly one JSON object with these fields and types: ${fields.join(", ")}. Do not include extra keys.`;
};

const runWebSearch = async (query: string): Promise<z.infer<typeof webSearchResultSchema>> => {
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
};

const buildSearchQuery = (contextData: Record<string, unknown>, prompt: string): string => {
  const topic = typeof contextData.topic === "string" ? contextData.topic : "";
  const audience = typeof contextData.audience === "string" ? contextData.audience : "";
  const query = `${topic} ${audience}`.trim();

  return query.length > 0 ? query : prompt;
};

export const openRouterService = {
  async executeWorkflowStep(input: {
    step: WorkflowLlmStep;
    promptId: string;
    promptTemplate: string;
    contextData: Record<string, unknown>;
  }): Promise<Record<string, unknown>> {
    const prompt = input.promptTemplate.replace(/{{(.*?)}}/g, (_, key: string) => {
      const value = input.contextData[key.trim()];
      return typeof value === "string" ? value : JSON.stringify(value ?? "");
    });
    const outputSchema = createOutputSchema(input.step);
    const schemaInstruction = buildSchemaInstruction(input.step);
    let enrichedContext = input.contextData;

    console.info(
      `[workflow] llm request step=${input.step.id} prompt=${input.promptId} model=${input.step.model} tools=${input.step.tools?.join(",") ?? "none"}`
    );

    if (input.step.tools?.includes("web_search")) {
      const query = buildSearchQuery(input.contextData, prompt);
      const searchResults = await runWebSearch(query);
      enrichedContext = {
        ...input.contextData,
        web_search_results: searchResults.results
      };

      console.info(
        `[workflow] web search step=${input.step.id} query=${JSON.stringify(query)} results=${JSON.stringify(searchResults.results)}`
      );
    }

    const response = await generateObject({
      model: modelForKey(input.step.model),
      schema: outputSchema,
      prompt: [
        prompt,
        schemaInstruction,
        "Use the provided context and keep field names exact.",
        `Context:\n${JSON.stringify(enrichedContext, null, 2)}`
      ].join("\n\n")
    });

    console.info(`[workflow] llm parsed response step=${input.step.id} output=${JSON.stringify(response.object)}`);

    return response.object as Record<string, unknown>;
  },

  async editDsl(input: {
    dsl: string;
    instruction: string;
  }): Promise<string> {
    console.info(`[chat] edit request model=smart instruction=${JSON.stringify(input.instruction)}`);

    try {
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

      console.info(`[chat] edit response model=smart dslLength=${response.object.dsl.length}`);

      return response.object.dsl;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Chat edit failed";
      console.error(`[chat] edit failure model=smart error=${message}`);
      throw error;
    }
  }
};
