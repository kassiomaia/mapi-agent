// O LOOP AGÊNTICO, em uma função só.
// Ciclo: pedir ao modelo -> se pediu ferramenta, executar -> devolver resultado -> repetir.
import Anthropic from "@anthropic-ai/sdk";
import { criarCliente, MODEL, cores } from "../shared/cliente.ts";
import { ferramentas, executarFerramenta } from "../shared/ferramentas.ts";

export type ChamadaFerramenta = {
  nome: string;
  entrada: Record<string, unknown>;
  saida: string;
  erro: boolean;
};

export type PassoAgente = {
  numero: number;
  stopReason: string | null;
  textoParcial: string;
  chamadas: ChamadaFerramenta[];
};

export type ResultadoAgente = {
  texto: string;
  passos: number;
  limiteAtingido: boolean;
  tokens: { entrada: number; saida: number };
};

export type OpcoesAgente = {
  tarefa: string;
  system?: string;
  maxPassos?: number; // limite de segurança: evita loops infinitos (e contas infinitas)
  onPasso?: (passo: PassoAgente) => void;
};

export async function executarAgente(opcoes: OpcoesAgente): Promise<ResultadoAgente> {
  const client = criarCliente();
  const maxPassos = opcoes.maxPassos ?? 10;
  const system =
    opcoes.system ?? "Você é um assistente prestativo. Use as ferramentas quando precisar e responda em português.";

  // O "estado" do agente é esta lista: ela cresce a cada volta do loop.
  const mensagens: Anthropic.MessageParam[] = [{ role: "user", content: opcoes.tarefa }];
  const tokens = { entrada: 0, saida: 0 };

  for (let numero = 1; numero <= maxPassos; numero++) {
    // (a) PENSAR: o modelo vê todo o histórico e as ferramentas disponíveis.
    const resposta = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      tools: ferramentas,
      messages: mensagens,
    });
    tokens.entrada += resposta.usage.input_tokens;
    tokens.saida += resposta.usage.output_tokens;

    // (b) Guardamos a resposta do modelo no histórico, incluindo os blocos tool_use.
    mensagens.push({ role: "assistant", content: resposta.content });

    const textoParcial = resposta.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join("\n");

    // (c) Se o modelo não pediu ferramentas, a tarefa terminou.
    if (resposta.stop_reason !== "tool_use") {
      opcoes.onPasso?.({ numero, stopReason: resposta.stop_reason, textoParcial, chamadas: [] });
      return { texto: textoParcial, passos: numero, limiteAtingido: false, tokens };
    }

    // (d) AGIR: executa cada ferramenta pedida e monta os tool_result correspondentes.
    const chamadas: ChamadaFerramenta[] = [];
    const resultados: Anthropic.ToolResultBlockParam[] = [];

    for (const bloco of resposta.content) {
      if (bloco.type !== "tool_use") continue;
      const entrada = bloco.input as Record<string, unknown>;
      try {
        const saida = executarFerramenta(bloco.name, entrada);
        chamadas.push({ nome: bloco.name, entrada, saida, erro: false });
        resultados.push({ type: "tool_result", tool_use_id: bloco.id, content: saida });
      } catch (e) {
        // Falhas não derrubam o agente: o erro volta ao modelo, que pode se recuperar.
        const mensagem = e instanceof Error ? e.message : String(e);
        chamadas.push({ nome: bloco.name, entrada, saida: mensagem, erro: true });
        resultados.push({ type: "tool_result", tool_use_id: bloco.id, content: mensagem, is_error: true });
      }
    }

    opcoes.onPasso?.({ numero, stopReason: resposta.stop_reason, textoParcial, chamadas });

    // (e) OBSERVAR: devolvemos os resultados ao modelo como mensagem do "user" e o loop recomeça.
    mensagens.push({ role: "user", content: resultados });
  }

  // Chegamos ao limite sem o modelo terminar.
  return { texto: "", passos: maxPassos, limiteAtingido: true, tokens };
}

// Impressão padrão de um passo, usada pelos demos.
export function imprimirPasso(passo: PassoAgente): void {
  console.log(`${cores.bold}Passo ${passo.numero}${cores.reset} ${cores.dim}(stop_reason: ${passo.stopReason})${cores.reset}`);
  if (passo.textoParcial) console.log(`  ${cores.dim}modelo:${cores.reset} ${passo.textoParcial}`);
  for (const c of passo.chamadas) {
    const cor = c.erro ? cores.red : cores.green;
    console.log(`  ${cores.yellow}→ ${c.nome}${cores.reset} ${JSON.stringify(c.entrada)}`);
    console.log(`    ${cor}${c.erro ? "erro" : "ok"}:${cores.reset} ${c.saida}`);
  }
}
