import type { WSContext } from "hono/ws";
import { createChat } from "../agents/chat.js";
import { parseClientMessage } from "./protocol.js";
import { PROMPT_MAX_LENGTH, type AppOptions, type ServerMessage } from "./types.js";

function send(ws: WSContext, message: ServerMessage): void {
  ws.send(JSON.stringify(message));
}

export function createChatSocketHandlers(options: AppOptions) {
  const chat = createChat({
    client: options.client,
    model: options.model,
    maxSteps: options.maxSteps,
  });
  let running: AbortController | undefined;

  async function answer(ws: WSContext, prompt: string): Promise<void> {
    const controller = new AbortController();
    running = controller;
    try {
      const result = await chat.ask(
        prompt,
        (agentEvent) => send(ws, { type: "event", event: agentEvent }),
        controller.signal,
      );
      send(ws, {
        type: "answer",
        text: result.text,
        blocked: result.blocked,
        stoppedByLimit: result.stoppedByLimit,
        nextStep: result.nextStep,
      });
    } catch (error) {
      if (controller.signal.aborted) {
        send(ws, { type: "cancelled" });
        return;
      }
      send(ws, {
        type: "error",
        message: error instanceof Error ? error.message : String(error),
      });
    } finally {
      running = undefined;
    }
  }

  return {
    onOpen(_event: unknown, ws: WSContext): void {
      send(ws, {
        type: "ready",
        provider: options.provider,
        model: options.model,
        maxSteps: options.maxSteps,
        promptMaxLength: PROMPT_MAX_LENGTH,
      });
    },

    async onMessage(event: { data: unknown }, ws: WSContext): Promise<void> {
      const message = parseClientMessage(event.data);
      if (!message) {
        send(ws, { type: "error", message: "Mensagem inválida" });
        return;
      }

      if (message.type === "cancel") {
        running?.abort();
        return;
      }

      if (running) {
        send(ws, { type: "error", message: "Aguarde a resposta atual terminar" });
        return;
      }

      await answer(ws, message.text);
    },

    onClose(): void {
      running?.abort();
    },
  };
}
