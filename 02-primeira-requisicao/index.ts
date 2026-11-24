// Tópico 2 — Conhecendo a API da Anthropic
// Pré-requisito: ANTHROPIC_API_KEY definida (no .env). Rode: bun run t2
import Anthropic from "@anthropic-ai/sdk";
import { criarCliente, MODEL, textoDa, titulo, cores } from "../shared/cliente.ts";

titulo("Tópico 2 — Primeira requisição à Messages API");

// 1) O cliente lê a API key do ambiente. Nunca escreva a chave no código.
const client = criarCliente();

// 2) System prompt: instruções de "papel" e estilo que valem para toda a conversa.
const system =
  "Você é um professor paciente que explica conceitos de IA em português. " +
  "Use frases curtas e um exemplo do dia a dia. Responda em no máximo 5 linhas.";

// 3) Primeira chamada: model, max_tokens, system e a lista de mensagens.
const primeira = await client.messages.create({
  model: MODEL,
  max_tokens: 400,
  system,
  messages: [{ role: "user", content: "O que é um token?" }],
});

console.log(`${cores.bold}Modelo:${cores.reset} ${primeira.model}`);
console.log(`${cores.bold}stop_reason:${cores.reset} ${primeira.stop_reason}`);
console.log(
  `${cores.bold}Tokens:${cores.reset} ${primeira.usage.input_tokens} de entrada, ` +
    `${primeira.usage.output_tokens} de saída\n`,
);
console.log(textoDa(primeira));

// 4) A API NÃO tem memória entre chamadas. Sem histórico, o modelo não sabe a pergunta anterior.
console.log(`\n${cores.dim}--- Sem histórico: o modelo não tem contexto ---${cores.reset}`);
const semHistorico = await client.messages.create({
  model: MODEL,
  max_tokens: 200,
  messages: [{ role: "user", content: "Qual foi a minha pergunta anterior?" }],
});
console.log(textoDa(semHistorico));

// 5) Com histórico: enviamos as mensagens anteriores de novo. Quem guarda a memória é o seu código.
const historico: Anthropic.MessageParam[] = [
  { role: "user", content: "O que é um token?" },
  { role: "assistant", content: textoDa(primeira) },
  { role: "user", content: "Qual foi a minha pergunta anterior?" },
];
console.log(`\n${cores.dim}--- Com histórico: o modelo consegue responder ---${cores.reset}`);
const comHistorico = await client.messages.create({ model: MODEL, max_tokens: 200, messages: historico });
console.log(textoDa(comHistorico));

console.log(`\n${cores.dim}Ideia-chave: a API é sem estado. O "estado" do agente é a lista de mensagens que você envia.${cores.reset}\n`);
