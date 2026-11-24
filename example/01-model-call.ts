import { createClient } from "../src/agents/client.js";
import { loadConfig } from "../src/agents/config.js";

const config = loadConfig(process.env);
const client = createClient(config.provider, process.env);

const userRequest = process.argv.slice(2).join(" ") || "Como está o tempo em Lisboa agora?";
console.log(`Pedido: ${userRequest}`);

const response = await client.messages.create({
  model: config.model,
  max_tokens: 1024,
  system: "Você é um agente que ajuda a planejar viagens. Responda em português, em poucas frases.",
  messages: [{ role: "user", content: userRequest }],
});

console.log(`\nstop_reason: ${response.stop_reason}`);
console.log(`tokens: ${response.usage.input_tokens} de entrada, ${response.usage.output_tokens} de saída`);

for (const block of response.content) {
  if (block.type === "text") {
    console.log(`\nResposta:\n${block.text}`);
  }
}
