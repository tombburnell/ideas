/** Interpolate `{{key}}` placeholders using the same rules as the LLM executor. */
export const interpolatePromptTemplate = (template: string, contextData: Record<string, unknown>): string =>
  template.replace(/{{(.*?)}}/g, (_, key: string) => {
    const value = contextData[key.trim()];
    return typeof value === "string" ? value : JSON.stringify(value ?? "");
  });
