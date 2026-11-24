import type Anthropic from "@anthropic-ai/sdk";
import {
  parseTripDetailsRequest,
  REQUEST_TRIP_DETAILS_TOOL_NAME,
  requestTripDetailsTool,
} from "./forms/trip-details-tool.js";
import { parseUiSpec, RENDER_UI_TOOL_NAME, renderUiTool } from "./generative-ui/render-ui-tool.js";
import { runTool, tools } from "./tools/index.js";
import { RUN_JAVASCRIPT_TOOL_NAME } from "./tools/run_javascript.js";
import type { ToolContext } from "./tools/types.js";
import type { AgentOptions, AgentResult } from "./types.js";

const BASE_SYSTEM_PROMPT =
  "Você é Mapi, agente pessoal que ajuda o usuário a planejar as férias. " +
  "Seu jeito: caloroso e animado com a viagem, mas direto e prático. Raciocine e fale em português, em frases curtas, " +
  "como quem conhece bem o assunto e quer ajudar a decidir. Não use emojis nem exclamações em excesso. " +
  "Resolva em etapas: use as ferramentas para buscar dados reais (passagens, clima, fotos, distâncias, localização e contas) " +
  "e trate os erros explicando o que faltou. Nunca invente preços, temperaturas ou distâncias que as ferramentas não trouxeram. " +
  "Ao terminar, quando fizer sentido, sugira em uma frase o próximo passo do planejamento que as ferramentas cobrem, " +
  "por exemplo ver o clima ou fotos do destino depois de pesquisar passagens. " +
  "Nunca sugira algo que já foi mostrado ao usuário. Se um plano completo de uma cidade já foi exibido nesta conversa, " +
  "não sugira ver fotos, clima, previsão, passagens, atrações, comida, bairros, dicas ou orçamento dessa cidade, porque o plano já mostra tudo isso. " +
  "Nesse caso, sugira montar um plano para outra cidade, de preferência uma que combine com a viagem, como um destino próximo para emendar. " +
  "Se o usuário pedir algo sobre uma cidade que já tem plano, responda normalmente; a regra vale só para as suas sugestões. " +
  "Se a mensagem for só um cumprimento, apresente-se em uma ou duas frases e diga o que você consegue fazer. " +
  "Responda somente sobre o que as ferramentas disponíveis cobrem. Se o pedido fugir desse escopo, como reservas, hotéis ou vistos, " +
  "diga com gentileza que isso fica fora do que você consegue fazer, sem responder ao assunto. " +
  "Quando a resposta tiver dados estruturados, como várias cidades, comparações, distâncias ou vários valores, " +
  `chame a ferramenta ${RENDER_UI_TOOL_NAME} uma única vez, depois de obter os dados, para exibir a resposta como interface. ` +
  "Em seguida, responda com um resumo curto em texto. Para respostas com um único valor, responda apenas em texto. " +
  "A ferramenta calculate_distance já exibe as distâncias em um mapa; não chame render_ui só para repetir as distâncias. " +
  "A ferramenta get_city_photos já exibe as fotos em uma galeria, com autor e licença; não chame render_ui nem liste as fotos no texto, " +
  "apenas comente a cidade em uma ou duas frases. " +
  "get_weather traz só a temperatura de agora. Para o tempo em datas futuras, como o período da viagem, use get_forecast: " +
  "até 16 dias à frente ela traz a previsão; depois disso, a média histórica das mesmas datas, que você deve apresentar como clima típico, não como previsão. " +
  "get_forecast já exibe o resultado ao usuário; não chame render_ui para repeti-lo. " +
  "Antes de plan_trip ou search_flights, confira se o usuário já informou as datas de ida e volta e quantas pessoas vão viajar. " +
  "Se faltar qualquer uma dessas informações, chame request_trip_details, preenchendo o que já souber, e escreva só uma frase curta " +
  "convidando o usuário a completar o formulário; não chame outras ferramentas nesse turno. " +
  "Quando a mensagem do usuário trouxer as datas e o número de pessoas, por exemplo vinda do formulário, chame as ferramentas direto. " +
  "Quando o usuário pedir um plano, um roteiro ou ajuda para organizar a viagem inteira, chame plan_trip uma única vez; " +
  "ela já pesquisa clima, fotos, passagens, atrações, comida, bairros, dicas, eventos e orçamento, e exibe o plano completo. " +
  "Não chame outras ferramentas para repetir essas pesquisas nem render_ui para mostrar o plano. Depois dela, responda em duas ou três frases " +
  "com o que mais chama atenção no plano e termine sugerindo montar um plano para outra cidade, citando uma cidade concreta, " +
  "por exemplo: Quer que eu monte também um plano para Porto? " +
  "A ferramenta search_flights já exibe as páginas encontradas em uma lista de links; não chame render_ui para repeti-las. " +
  "Resuma em poucas frases a faixa de preços citada e onde ela aparece, e deixe claro que são preços encontrados na web, " +
  "que podem estar desatualizados, e não uma cotação. Converta datas relativas, como 'em dezembro', para AAAA-MM-DD a partir da data de hoje. " +
  "Para qualquer conta com vários números, datas, distâncias ou moedas, use run_javascript em vez de calcular de cabeça, " +
  "e use os números que ela devolver. Para uma única operação entre dois números, use calculate. " +
  "Antes, garanta que os dados existem: se a conta depende de passagens, clima ou plano que ainda não foram buscados nesta conversa, " +
  "chame a ferramenta de busca primeiro. Valores que o usuário disse no chat, como número de pessoas ou orçamento, vão no campo input. " +
  "Não use run_javascript para um único valor que já está na resposta de outra ferramenta, nem para coisas que não são cálculo. " +
  "Se run_javascript devolver erro, leia a mensagem, corrija o código e tente de novo. " +
  "run_javascript já exibe o resultado ao usuário; não chame render_ui para repeti-lo. " +
  "Depois dela, explique o resultado em duas ou três frases e diga as premissas usadas, como número de noites, câmbio ou se a passagem é ida e volta. " +
  "Não responda com texto formatado em Markdown. Use somente texto puro.";

function systemPrompt(): string {
  const today = new Date().toISOString().slice(0, 10);
  return `${BASE_SYSTEM_PROMPT} A data de hoje é ${today}.`;
}

function textOf(content: ReadonlyArray<Anthropic.ContentBlock>): string {
  return content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join("\n");
}

const agentTools: Anthropic.Tool[] = [...tools, renderUiTool, requestTripDetailsTool];

function toolContext(block: Anthropic.ToolUseBlock, options: AgentOptions): ToolContext {
  return {
    client: options.client,
    model: options.model,
    signal: options.signal,
    reportProgress: (progress) =>
      options.onEvent({ type: "progress", toolUseId: block.id, name: block.name, progress }),
    toolResults: options.toolResults,
  };
}

async function executeToolCall(
  block: Anthropic.ToolUseBlock,
  options: AgentOptions,
): Promise<Anthropic.ToolResultBlockParam> {
  const { onEvent } = options;
  if (block.name === RENDER_UI_TOOL_NAME) {
    const parsed = parseUiSpec(block.input);
    if (!parsed.ok) {
      onEvent({ type: "result", name: block.name, output: parsed.error, isError: true });
      return { type: "tool_result", tool_use_id: block.id, content: parsed.error, is_error: true };
    }
    onEvent({ type: "ui", spec: parsed.spec });
    return { type: "tool_result", tool_use_id: block.id, content: "Interface exibida ao usuário." };
  }

  if (block.name === REQUEST_TRIP_DETAILS_TOOL_NAME) {
    const parsed = parseTripDetailsRequest(block.input);
    if (!parsed.ok) {
      onEvent({ type: "result", name: block.name, output: parsed.error, isError: true });
      return { type: "tool_result", tool_use_id: block.id, content: parsed.error, is_error: true };
    }
    onEvent({ type: "ui", spec: { blocks: [parsed.block] } });
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: "Formulário exibido ao usuário. A resposta dele vem na próxima mensagem.",
    };
  }

  onEvent({ type: "tool", name: block.name, input: block.input });
  try {
    const execution = await runTool(block.name, block.input, toolContext(block, options));
    onEvent({ type: "result", name: block.name, output: execution.text, isError: execution.isError });
    if (execution.ui) {
      onEvent({ type: "ui", spec: execution.ui });
    }
    if (!execution.isError && block.name !== RUN_JAVASCRIPT_TOOL_NAME) {
      options.toolResults?.push({ tool: block.name, input: block.input, output: execution.output });
    }
    return {
      type: "tool_result",
      tool_use_id: block.id,
      content: execution.text,
      ...(execution.isError ? { is_error: true } : {}),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    onEvent({ type: "result", name: block.name, output: message, isError: true });
    return { type: "tool_result", tool_use_id: block.id, content: message, is_error: true };
  }
}

export async function runAgent(
  conversation: Anthropic.MessageParam[],
  options: AgentOptions,
): Promise<AgentResult> {
  const { client, model, maxSteps, onEvent, signal } = options;
  let inputTokens = 0;
  let outputTokens = 0;

  for (let step = 1; step <= maxSteps; step++) {
    signal?.throwIfAborted();
    const response = await client.messages.create(
      {
        model,
        max_tokens: 16000,
        system: systemPrompt(),
        tools: agentTools,
        messages: conversation,
        thinking: { type: "adaptive", display: "summarized" },
        output_config: { effort: "medium" },
      },
      signal ? { signal } : {},
    );
    inputTokens += response.usage.input_tokens;
    outputTokens += response.usage.output_tokens;
    conversation.push({ role: "assistant", content: response.content });

    for (const block of response.content) {
      if (block.type === "thinking" && block.thinking.trim() !== "") {
        onEvent({ type: "thinking", text: block.thinking.trim() });
      }
    }

    if (response.stop_reason !== "tool_use") {
      const text = textOf(response.content);
      return { text, nextStep: undefined, steps: step, stoppedByLimit: false, blocked: false, inputTokens, outputTokens };
    }

    const results: Anthropic.ToolResultBlockParam[] = [];
    let awaitingUser = false;
    for (const block of response.content) {
      if (block.type !== "tool_use") continue;
      signal?.throwIfAborted();
      const result = await executeToolCall(block, options);
      results.push(result);
      if (block.name === REQUEST_TRIP_DETAILS_TOOL_NAME && !result.is_error) awaitingUser = true;
    }
    conversation.push({ role: "user", content: results });

    if (awaitingUser) {
      return {
        text: textOf(response.content),
        nextStep: undefined,
        steps: step,
        stoppedByLimit: false,
        blocked: false,
        inputTokens,
        outputTokens,
      };
    }
  }

  return { text: "", nextStep: undefined, steps: maxSteps, stoppedByLimit: true, blocked: false, inputTokens, outputTokens };
}
