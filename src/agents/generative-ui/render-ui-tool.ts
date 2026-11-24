import type Anthropic from "@anthropic-ai/sdk";
import { toInputSchema } from "../tools/define-tool.js";
import { uiSpecSchema } from "./schema.js";
import type { UiSpecParseResult } from "./types.js";

export const RENDER_UI_TOOL_NAME = "render_ui";

export const renderUiTool: Anthropic.Tool = {
  name: RENDER_UI_TOOL_NAME,
  description:
    "Exibe a resposta ao usuário como uma interface visual. Use quando a resposta tiver dados estruturados, " +
    "como várias cidades, comparações, tabelas ou indicadores. Blocos disponíveis: text (parágrafo), " +
    "stats (cartões de indicadores), table (tabela), list (lista), meter (medidor com mínimo e máximo), " +
    "tabs (abas com blocos simples dentro) e accordion (seções expansíveis com blocos simples dentro). " +
    "Use apenas valores obtidos pelas outras ferramentas.",
  input_schema: toInputSchema(uiSpecSchema),
};

export function parseUiSpec(input: unknown): UiSpecParseResult {
  const result = uiSpecSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: `Invalid UI spec: ${result.error.message}` };
  }
  return { ok: true, spec: result.data };
}
