import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { RegisteredTool, Tool } from "./types.js";

export function toInputSchema(inputSchema: z.ZodType): Anthropic.Tool["input_schema"] {
  const schema = z.toJSONSchema(inputSchema);
  if (schema.type !== "object") {
    throw new Error("The input of a tool must be an object");
  }
  return { ...schema, type: "object" };
}

export function defineTool<InputSchema extends z.ZodType, Output>(
  tool: Tool<InputSchema, Output>,
): RegisteredTool {
  return {
    definition: {
      name: tool.name,
      description: tool.description,
      input_schema: toInputSchema(tool.inputSchema),
    },
    execute: async (input, context) => {
      const validation = tool.inputSchema.safeParse(input);
      if (!validation.success) {
        throw new Error(`Invalid input for ${tool.name}: ${validation.error.message}`);
      }
      const output = await tool.execute(validation.data, context);
      return { text: tool.formatOutput(output), ui: tool.present?.(output), output, isError: tool.isError?.(output) ?? false };
    },
  };
}
