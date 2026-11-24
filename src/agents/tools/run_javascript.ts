import { z } from "zod";
import { runInSandbox } from "../services/sandbox/run-sandbox.js";
import type { SandboxRun } from "../services/sandbox/types.js";
import { DISPLAY_KINDS, toDisplay, type DisplayKind } from "./code-run-display.js";
import { defineTool } from "./define-tool.js";
import { buildSandboxData, describeSandboxData } from "./sandbox-data.js";
import type { ToolContext } from "./types.js";

export const RUN_JAVASCRIPT_TOOL_NAME = "run_javascript";
const CODE_MAX_LENGTH = 8000;

const inputSchema = z.object({
  goal: z.string().trim().min(1).max(160).describe("O que o código calcula, em uma frase, por exemplo: custo total para 2 pessoas em reais"),
  code: z
    .string()
    .trim()
    .min(1)
    .max(CODE_MAX_LENGTH)
    .describe("Corpo de função JavaScript que lê data, input e helpers e termina com return de um valor JSON pequeno"),
  input: z
    .record(z.string(), z.unknown())
    .optional()
    .describe("Valores ditos pelo usuário que não estão em data, por exemplo { travelers: 3, budgetBrl: 10000 }"),
  show: z
    .enum(DISPLAY_KINDS)
    .optional()
    .describe("Como exibir o resultado: table para lista de objetos, stat para um número ou objeto plano com até 6 números, list para lista de textos. Omita para o servidor escolher"),
});

type RunJavascriptInput = z.output<typeof inputSchema>;

type CodeRun = Readonly<{
  goal: string;
  code: string;
  show: DisplayKind | undefined;
  run: SandboxRun;
  dataSummary: string;
}>;

async function runJavascript(input: RunJavascriptInput, context: ToolContext): Promise<CodeRun> {
  const data = buildSandboxData(context.toolResults ?? []);
  const run = await runInSandbox({ code: input.code, data, input: input.input ?? {} });
  return { goal: input.goal, code: input.code, show: input.show, run, dataSummary: describeSandboxData(data) };
}

function formatOutput({ run, dataSummary }: CodeRun): string {
  if (run.ok) {
    return JSON.stringify({
      value: run.value,
      ...(run.logs.length > 0 ? { logs: run.logs } : {}),
      ...(run.truncated ? { truncated: true } : {}),
      ms: run.durationMs,
    });
  }
  const where = run.error.line ? ` na linha ${run.error.line}` : "";
  const logs = run.logs.length > 0 ? ` Logs antes do erro: ${run.logs.join(" | ")}.` : "";
  return `Erro ${run.error.kind}${where}: ${run.error.message}.${logs} Dados disponíveis → ${dataSummary}. Corrija o código e tente de novo.`;
}

export const runJavascriptTool = defineTool({
  name: RUN_JAVASCRIPT_TOOL_NAME,
  description:
    "Executa JavaScript numa sandbox isolada para fazer contas exatas com os dados que as outras ferramentas já trouxeram nesta conversa. " +
    "Use para somar orçamentos, converter moedas, comparar datas, cruzar clima com preço, ordenar atrações por distância " +
    "ou simular cenários, como 'e se forem 3 pessoas?' ou 'e se ficar 10 dias?'. " +
    "O código não tem rede, arquivos nem require. As chaves de cidade são o nome em minúsculas, sem acentos e com hífen no lugar de espaço, por exemplo sao-paulo. Ele lê: " +
    "data.plans[cidade] (de plan_trip: city, lat, lon, origin, departureDate, returnDate, nights, days, travelers, currency, " +
    "attractions e neighborhoods com name, lat e lon reais quando a Wikipedia tem, itinerary com day, title, place, lat e lon, food, " +
    "budgetPerPersonPerDay com faixas em texto como '€ 60–90', flights com cheapest e offers em texto, " +
    "weather com forecast por dia (date, maxC, minC, rainChance em %) e climate com médias históricas); " +
    "data.forecasts[cidade] (de get_forecast, mesmo formato de weather); " +
    "data.flights['origem→destino'] (de search_flights: offers com site, title e price em texto); " +
    "data.distances (de calculate_distance: from, to, km); data.places[cidade] (lat e lon); data.weatherNow[cidade] (celsius). " +
    "input traz os valores passados no campo input. " +
    "helpers traz km(a, b), totalKm(rota), bestOrder(pontos), nearestNeighbor(pontos), daysBetween(de, até), addDays(data, n), " +
    "sum(valores), average(valores), round(valor, casas), money('R$ 1.495') que vira 1495 e range('€ 60–90') que vira { min: 60, max: 90 }; " +
    "os pontos precisam de lat e lon. " +
    "Escreva o corpo de uma função que termina com return de um JSON pequeno, num destes formatos, que viram interface: " +
    "um número ou um objeto plano com até 6 números (show: stat), uma lista de objetos planos (show: table) ou uma lista de textos (show: list). " +
    "Evite objetos aninhados no return. Se não souber o formato, retorne Object.keys(data.plans) primeiro. " +
    "Limite: 2 s e 32 MB. Os números do resultado são exatos; use-os na resposta sem recalcular. O resultado já é exibido ao usuário.",
  inputSchema,
  execute: runJavascript,
  formatOutput,
  isError: ({ run }) => !run.ok,
  present: ({ goal, code, show, run }) => ({
    blocks: [
      {
        type: "code_run",
        goal,
        code,
        status: run.ok ? "ok" : "error",
        durationMs: run.durationMs,
        logs: run.logs,
        ...(run.ok
          ? { display: toDisplay(run.value, show) }
          : { error: `${run.error.line ? `Linha ${run.error.line}: ` : ""}${run.error.message}` }),
      },
    ],
  }),
});
