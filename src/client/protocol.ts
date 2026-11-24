import type { ServerMessage } from "../server/types.js";

const serverMessageTypes: ReadonlySet<string> = new Set([
  "ready",
  "event",
  "answer",
  "cancelled",
  "error",
]);

function isServerMessage(value: unknown): value is ServerMessage {
  return (
    typeof value === "object" &&
    value !== null &&
    "type" in value &&
    typeof value.type === "string" &&
    serverMessageTypes.has(value.type)
  );
}

export function parseServerMessage(raw: unknown): ServerMessage | undefined {
  if (typeof raw !== "string") return undefined;
  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch {
    return undefined;
  }
  return isServerMessage(data) ? data : undefined;
}
