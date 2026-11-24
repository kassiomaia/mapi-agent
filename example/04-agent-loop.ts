import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../src/agents/client.js";
import { loadConfig } from "../src/agents/config.js";
import { runTool, tools } from "../src/agents/tools/index.js";
import type { ToolContext } from "../src/agents/tools/types.js";

const MAX_STEPS = 5;

const SYSTEM_PROMPT =
  "Você é um agente que ajuda a planejar viagens. Use as ferramentas para buscar dados reais " +
  "e responda em português, em poucas frases, sem Markdown.";

const EXAMPLE_TOOL_NAMES: ReadonlySet<string> = new Set([
  "get_weather",
  "get_coordinates",
  "calculate_distance",
  "calculate",
]);

const config = loadConfig(process.env);
const client = createClient(config.provider, process.env);
const exampleTools = tools.filter((tool) => EXAMPLE_TOOL_NAMES.has(tool.name));

const toolContext: ToolContext = {
  client,
  model: config.model,
  signal: undefined,
  reportProgress: () => undefined,
};

async function executeTool(toolUse: Anthropic.ToolUseBlock): Promise<Anthropic.ToolResultBlockParam> {
  try {
    const execution = await runTool(toolUse.name, toolUse.input, toolContext);
    return { type: "tool_result", tool_use_id: toolUse.id, content: execution.text };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { type: "tool_result", tool_use_id: toolUse.id, content: message, is_error: true };
  }
}

async function runAgent(userRequest: string): Promise<string> {
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: userRequest }];
  let steps = 0;

  while (steps < MAX_STEPS) {
    console.log(`\n── Passo ${steps + 1}: chamando o modelo`);
    const response = await client.messages.create({
      model: config.model,
      max_tokens: 2048,
      system: SYSTEM_PROMPT,
      tools: exampleTools,
      messages,
    });
    console.log(`   stop_reason: ${response.stop_reason}`);

    if (response.stop_reason !== "tool_use") {
      return response.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("\n");
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      console.log(`   tool_use    → ${block.name}(${JSON.stringify(block.input)})`);
      const result = await executeTool(block);
      console.log(`   tool_result ← ${String(result.content).split("\n")[0]}${result.is_error ? " (erro)" : ""}`);
      results.push(result);
    }

    messages.push({ role: "assistant", content: response.content });
    messages.push({ role: "user", content: results });
    steps += 1;
  }

  return `Parei depois de ${MAX_STEPS} passos sem chegar a uma resposta final.`;
}

const userRequest =
  process.argv.slice(2).join(" ") || "Quanto Lisboa está mais quente que Paris agora? E qual a distância entre as duas?";
console.log(`Pedido: ${userRequest}`);

const answer = await runAgent(userRequest);
console.log(`\n── Resposta final\n${answer}`);
