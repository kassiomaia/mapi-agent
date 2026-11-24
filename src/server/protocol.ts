import { z } from "zod";
import { PROMPT_MAX_LENGTH, type ClientMessage } from "./types.js";

const clientMessageSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("prompt"),
    text: z.string().trim().min(1).max(PROMPT_MAX_LENGTH),
  }),
  z.object({
    type: z.literal("cancel"),
  }),
]);

export function parseClientMessage(raw: unknown): ClientMessage | undefined {
  let json: unknown;
  try {
    json = JSON.parse(typeof raw === "string" ? raw : "");
  } catch {
    return undefined;
  }
  const result = clientMessageSchema.safeParse(json);
  return result.success ? result.data : undefined;
}
