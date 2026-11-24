import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { createClient } from "../src/agents/client.js";
import { loadConfig } from "../src/agents/config.js";
import { fetchForecast, geocodeCity } from "../src/agents/services/open-meteo.js";

const config = loadConfig(process.env);
const client = createClient(config.provider, process.env);

const SYSTEM_PROMPT = "Você é um agente que ajuda a planejar viagens. Use as ferramentas e responda em português, em poucas frases.";

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

const weatherInputSchema = z.object({ city: z.string() });

async function getWeather(input: unknown): Promise<string> {
  const { city } = weatherInputSchema.parse(input);
  const place = await geocodeCity(city);
  if (!place) {
    throw new Error(`Cidade não encontrada: ${city}`);
  }
  const forecast = await fetchForecast(place.latitude, place.longitude);
  return `${place.name} (${place.country}): ${forecast.currentCelsius} °C`;
}

const userRequest = process.argv.slice(2).join(" ") || "Como está o tempo em Lisboa agora?";
console.log(`Pedido: ${userRequest}`);

const messages: Anthropic.MessageParam[] = [{ role: "user", content: userRequest }];

console.log("\n── Chamada 1");
const first = await client.messages.create({
  model: config.model,
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  tools: [weatherTool],
  messages,
});
console.log(`   stop_reason: ${first.stop_reason}`);

const results: Anthropic.ToolResultBlockParam[] = [];
for (const block of first.content) {
  if (block.type !== "tool_use") continue;
  console.log(`   tool_use    → ${block.name}(${JSON.stringify(block.input)})`);
  const output = await getWeather(block.input);
  console.log(`   tool_result ← ${output}`);
  results.push({ type: "tool_result", tool_use_id: block.id, content: output });
}

messages.push({ role: "assistant", content: first.content });
messages.push({ role: "user", content: results });

console.log("\n── Chamada 2");
const second = await client.messages.create({
  model: config.model,
  max_tokens: 1024,
  system: SYSTEM_PROMPT,
  tools: [weatherTool],
  messages,
});
console.log(`   stop_reason: ${second.stop_reason}`);

for (const block of second.content) {
  if (block.type === "text") {
    console.log(`\nResposta:\n${block.text}`);
  }
}
