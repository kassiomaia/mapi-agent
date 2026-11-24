import type { CodeRunCell, CodeRunDisplay } from "../generative-ui/types.js";

export const DISPLAY_KINDS = ["table", "stat", "list"] as const;
export type DisplayKind = (typeof DISPLAY_KINDS)[number];

const MAX_ROWS = 30;
const MAX_COLUMNS = 8;
const MAX_STATS = 6;
const MAX_LIST_ITEMS = 30;
const JSON_LIMIT = 2000;

type PlainObject = Readonly<Record<string, unknown>>;

function isPlainObject(value: unknown): value is PlainObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toCell(value: unknown): CodeRunCell {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  return JSON.stringify(value);
}

function isPrimitive(value: unknown): boolean {
  return value === null || ["string", "number", "boolean"].includes(typeof value);
}

function asTable(value: unknown): CodeRunDisplay | undefined {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPlainObject)) return undefined;
  const rows = value.slice(0, MAX_ROWS) as ReadonlyArray<PlainObject>;
  const columns = [...new Set(rows.flatMap((row) => Object.keys(row)))].slice(0, MAX_COLUMNS);
  return { kind: "table", columns, rows: rows.map((row) => columns.map((column) => toCell(row[column]))) };
}

function asStats(value: unknown): CodeRunDisplay | undefined {
  if (typeof value === "number") return { kind: "stats", items: [{ label: "Resultado", value }] };
  if (!isPlainObject(value)) return undefined;
  if (typeof value.label === "string" && isPrimitive(value.value) && Object.keys(value).length === 2) {
    return { kind: "stats", items: [{ label: value.label, value: toCell(value.value) }] };
  }
  const entries = Object.entries(value);
  if (entries.length === 0 || entries.length > MAX_STATS || !entries.every(([, item]) => isPrimitive(item))) return undefined;
  return { kind: "stats", items: entries.map(([label, item]) => ({ label, value: toCell(item) })) };
}

function asList(value: unknown): CodeRunDisplay | undefined {
  if (!Array.isArray(value) || value.length === 0 || !value.every(isPrimitive)) return undefined;
  return { kind: "list", items: value.slice(0, MAX_LIST_ITEMS).map((item) => String(item)) };
}

function asJson(value: unknown): CodeRunDisplay {
  const text = JSON.stringify(value, null, 2) ?? "null";
  return { kind: "json", text: text.length > JSON_LIMIT ? `${text.slice(0, JSON_LIMIT)}\n…` : text };
}

// Picks how to show the value. The requested kind wins when the value fits it; otherwise the server picks one,
// so a mismatch between what the model asked for and what the code returned never breaks the chat.
export function toDisplay(value: unknown, requested: DisplayKind | undefined): CodeRunDisplay {
  const automatic = (): CodeRunDisplay => asTable(value) ?? asList(value) ?? asStats(value) ?? asJson(value);
  switch (requested) {
    case "table":
      return asTable(value) ?? automatic();
    case "stat":
      return asStats(value) ?? automatic();
    case "list":
      return asList(value) ?? automatic();
    default:
      return automatic();
  }
}
