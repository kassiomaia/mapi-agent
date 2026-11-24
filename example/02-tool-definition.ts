import type Anthropic from "@anthropic-ai/sdk";
import { createClient } from "../src/agents/client.js";
import { loadConfig } from "../src/agents/config.js";

const config = loadConfig(process.env);
const client = createClient(config.provider, process.env);

const weatherTool: Anthropic.Tool = {
  name: "get_weather",
  description: "Retorna a temperatura atual de uma cidade, em graus Celsius.",
  input_schema: {
    type: "object",
    properties: {
      city: { type: "string", description: "Nome da cidade, por exemplo: Lisboa" },
    },
    required: ["city"],
  },
};

const userRequest = process.argv.slice(2).join(" ") || "Como está o tempo em Lisboa agora?";
console.log(`Pedido: ${userRequest}`);

const response = await client.messages.create({
  model: config.model,
  max_tokens: 1024,
  system: "Você é um agente que ajuda a planejar viagens. Use as ferramentas para buscar dados reais.",
  tools: [weatherTool],
  messages: [{ role: "user", content: userRequest }],
});

console.log(`\nstop_reason: ${response.stop_reason}`);

for (const block of response.content) {
  if (block.type === "text") {
    console.log(`text     → ${block.text}`);
  }
  if (block.type === "tool_use") {
    console.log(`tool_use → ${block.name}(${JSON.stringify(block.input)})  id: ${block.id}`);
  }
}

console.log("\nO modelo não executa a ferramenta: ele só pede. Quem executa é o nosso código, no próximo passo.");
