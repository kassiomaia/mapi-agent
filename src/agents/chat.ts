import type Anthropic from "@anthropic-ai/sdk";
import { runAgent } from "./agent.js";
import { createChatContext } from "./context/chat-context.js";
import { extractNextStep } from "./decisions/next-step.js";
import { checkScope } from "./guardrails/scope.js";
import type { AgentEvent, AgentResult, Chat, ChatOptions, NextStep } from "./types.js";

const OUT_OF_SCOPE_TEXT =
  "Isso fica fora do meu mapa. Eu ajudo a planejar viagens: preço de passagens, clima agora no destino, " +
  "fotos da cidade, distância entre as paradas e as contas do orçamento. Quer começar por algum destino?";

export function createChat(options: ChatOptions): Chat {
  const conversation: Anthropic.MessageParam[] = [];
  const context = createChatContext();

  return {
    ask: async (prompt, onEvent, signal) => {
      const decision = await checkScope(
        options.client,
        options.model,
        prompt,
        context.describe(),
        signal,
      );
      if (!decision.allowed) {
        context.recordTurn(prompt, false);
        onEvent({ type: "guardrail", reason: decision.reason });
        return blockedResult();
      }

      const sizeBefore = conversation.length;
      const pausedTurn = conversation[sizeBefore - 1];
      if (pausedTurn?.role === "user") {
        conversation[sizeBefore - 1] = appendText(pausedTurn, prompt);
      } else {
        conversation.push({ role: "user", content: prompt });
      }
      const pendingInputs = new Map<string, unknown[]>();

      const relay = (event: AgentEvent): void => {
        if (event.type === "tool") {
          pendingInputs.set(event.name, [...(pendingInputs.get(event.name) ?? []), event.input]);
        }
        if (event.type === "result") {
          const queue = pendingInputs.get(event.name) ?? [];
          const input = queue.shift();
          if (!event.isError) {
            context.registerToolCall(event.name, input);
          }
        }
        onEvent(event);
      };

      try {
        const result = await runAgent(conversation, { ...options, onEvent: relay, signal });
        context.recordTurn(prompt, true);
        if (result.stoppedByLimit) return result;
        return { ...result, nextStep: await findNextStep(options, prompt, result.text, context.describe(), signal) };
      } catch (error) {
        conversation.splice(sizeBefore);
        if (pausedTurn?.role === "user") conversation[sizeBefore - 1] = pausedTurn;
        context.recordTurn(prompt, false);
        throw error;
      }
    },
  };
}

function appendText(message: Anthropic.MessageParam, text: string): Anthropic.MessageParam {
  const blocks: Anthropic.ContentBlockParam[] =
    typeof message.content === "string" ? [{ type: "text", text: message.content }] : [...message.content];
  return { role: "user", content: [...blocks, { type: "text", text }] };
}

async function findNextStep(
  options: ChatOptions,
  prompt: string,
  answer: string,
  contextDescription: string,
  signal: AbortSignal | undefined,
): Promise<NextStep | undefined> {
  try {
    return await extractNextStep(options.client, options.model, { prompt, answer, context: contextDescription }, signal);
  } catch {
    return undefined;
  }
}

function blockedResult(): AgentResult {
  return {
    text: OUT_OF_SCOPE_TEXT,
    nextStep: undefined,
    steps: 0,
    stoppedByLimit: false,
    blocked: true,
    inputTokens: 0,
    outputTokens: 0,
  };
}
