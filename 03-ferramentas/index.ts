// Tópico 3 — Dando ferramentas ao agente
// Aqui vemos só a PARTE 1 do ciclo: o modelo pede uma ferramenta e NÓS executamos localmente.
// No tópico 4 devolvemos o resultado ao modelo para ele continuar.
import Anthropic from "@anthropic-ai/sdk";
import { criarCliente, MODEL, titulo, cores } from "../shared/cliente.ts";

titulo("Tópico 3 — Tool use: definição e execução local");

// ---------------------------------------------------------------------------
// 1) DEFINIÇÃO: o contrato que o modelo enxerga.
//    - name: identificador único
//    - description: quando e para que usar (é o que o modelo lê para decidir)
//    - input_schema: JSON Schema descrevendo os argumentos
// ---------------------------------------------------------------------------
const ferramentas: Anthropic.Tool[] = [
  {
    name: "calcular",
    description: "Faz contas aritméticas. Use sempre que precisar calcular algo.",
    input_schema: {
      type: "object",
      properties: {
        expressao: { type: "string", description: "Expressão, ex.: '(12 * 7) + 3'" },
      },
      required: ["expressao"],
    },
  },
  {
    name: "converter_temperatura",
    description: "Converte uma temperatura entre Celsius e Fahrenheit.",
    input_schema: {
      type: "object",
      properties: {
        valor: { type: "number", description: "Valor a converter" },
        de: {
          type: "string",
          enum: ["celsius", "fahrenheit"],
          description: "Unidade de origem",
        },
      },
      required: ["valor", "de"],
    },
  },
];

// ---------------------------------------------------------------------------
// 2) EXECUÇÃO LOCAL: o código que roda de verdade no seu computador.
//    O modelo NÃO executa nada; ele apenas pede (tool_use) e nós decidimos como atender.
// ---------------------------------------------------------------------------
const implementacoes: Record<string, (entrada: Record<string, unknown>) => string> = {
  calcular: (entrada) => {
    const expressao = String(entrada.expressao);
    if (!/^[\d+\-*\/().\s]+$/.test(expressao)) return "Erro: expressão inválida";
    return String(Function(`"use strict"; return (${expressao});`)());
  },
  converter_temperatura: (entrada) => {
    const valor = Number(entrada.valor);
    if (entrada.de === "celsius") return `${((valor * 9) / 5 + 32).toFixed(1)} °F`;
    return `${(((valor - 32) * 5) / 9).toFixed(1)} °C`;
  },
};

// ---------------------------------------------------------------------------
// 3) Uma chamada com as ferramentas disponíveis
// ---------------------------------------------------------------------------
const client = criarCliente();

const resposta = await client.messages.create({
  model: MODEL,
  max_tokens: 1024,
  tools: ferramentas,
  messages: [{ role: "user", content: "Quanto é (12 * 7) + 3? E quanto são 25 °C em Fahrenheit?" }],
});

console.log(`${cores.bold}stop_reason:${cores.reset} ${resposta.stop_reason}\n`);

// Quando o modelo quer usar uma ferramenta, stop_reason vale "tool_use" e vêm blocos do tipo tool_use.
for (const bloco of resposta.content) {
  if (bloco.type === "text" && bloco.text.trim()) {
    console.log(`${cores.dim}texto do modelo:${cores.reset} ${bloco.text}`);
  }
  if (bloco.type === "tool_use") {
    console.log(`${cores.yellow}pedido${cores.reset} ${bloco.name} (id: ${bloco.id})`);
    console.log(`  entrada: ${JSON.stringify(bloco.input)}`);

    const executar = implementacoes[bloco.name];
    const saida = executar ? executar(bloco.input as Record<string, unknown>) : "ferramenta desconhecida";
    console.log(`  ${cores.green}resultado local:${cores.reset} ${saida}\n`);
  }
}

console.log(`${cores.dim}Próximo passo (tópico 4): enviar cada resultado de volta ao modelo em um tool_result,` +
  ` usando o mesmo id, para ele continuar a tarefa.${cores.reset}\n`);
