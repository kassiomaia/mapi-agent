// Tópico 1 — O que é um agente de IA?
// Este demo NÃO chama a API: ele simula, em código, a diferença entre os três modelos mentais.
import { titulo, cores } from "../shared/cliente.ts";

titulo("Tópico 1 — Chatbot x Automação x Agente");

// ---------------------------------------------------------------------------
// 1) CHATBOT: uma entrada -> uma resposta. Não age no mundo, não usa ferramentas.
// ---------------------------------------------------------------------------
function chatbot(pergunta: string): string {
  const respostas: Record<string, string> = {
    "qual o horário de funcionamento?": "Funcionamos de segunda a sexta, das 9h às 18h.",
  };
  return respostas[pergunta.toLowerCase()] ?? "Desculpe, não entendi a pergunta.";
}

// ---------------------------------------------------------------------------
// 2) AUTOMAÇÃO: sequência FIXA de passos escritos por um humano. Sem decisão própria.
// ---------------------------------------------------------------------------
function automacao(pedidoDeReembolso: { valor: number; pedidoPago: boolean }): string {
  if (!pedidoDeReembolso.pedidoPago) return "Pedido não pago: reembolso recusado.";
  if (pedidoDeReembolso.valor > 500) return "Valor acima de 500: encaminhado para revisão humana.";
  return "Reembolso aprovado automaticamente.";
}

// ---------------------------------------------------------------------------
// 3) AGENTE: um ciclo PERCEBER -> DECIDIR -> AGIR -> OBSERVAR, até cumprir o objetivo.
//    Aqui a decisão é simulada por regras simples. Em um agente real, quem decide é o
//    modelo de linguagem (LLM), que escolhe a próxima ferramenta a cada volta.
// ---------------------------------------------------------------------------
type Ferramenta = { nome: string; executar: () => string };

function agenteSimulado(objetivo: string): void {
  const ferramentas: Ferramenta[] = [
    { nome: "buscar_clima_lisboa", executar: () => "Lisboa: 18 °C" },
    { nome: "buscar_clima_porto", executar: () => "Porto: 16 °C" },
  ];
  const observacoes: string[] = [];

  console.log(`${cores.bold}Objetivo:${cores.reset} ${objetivo}`);
  for (let passo = 1; passo <= 5; passo++) {
    // DECIDIR (na vida real, o LLM faz isso olhando o objetivo e as observações)
    const proxima = ferramentas.find((f) => !observacoes.some((o) => o.startsWith(f.nome)));
    if (!proxima) {
      console.log(`${cores.green}Objetivo concluído no passo ${passo}.${cores.reset}`);
      break;
    }
    // AGIR
    const resultado = proxima.executar();
    // OBSERVAR (o resultado volta para o contexto da próxima decisão)
    observacoes.push(`${proxima.nome} -> ${resultado}`);
    console.log(`  passo ${passo}: ${cores.yellow}${proxima.nome}${cores.reset} -> ${resultado}`);
  }
}

// ---------------------------------------------------------------------------
console.log(`${cores.bold}Chatbot${cores.reset} (responde):`);
console.log("  ", chatbot("Qual o horário de funcionamento?"));

console.log(`\n${cores.bold}Automação${cores.reset} (segue roteiro fixo):`);
console.log("  ", automacao({ valor: 900, pedidoPago: true }));

console.log(`\n${cores.bold}Agente${cores.reset} (decide o que fazer em cada passo):`);
agenteSimulado("Comparar a temperatura de Lisboa e do Porto");

console.log(`
${cores.dim}Resumo:
- Chatbot: responde. Não age.
- Automação: executa um roteiro fixo. Não decide.
- Agente: tem OBJETIVO, FERRAMENTAS e um CICLO de execução. Decide a próxima ação
  com base no que observou.${cores.reset}
`);
