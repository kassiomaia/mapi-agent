import type { AgentEvent, ModelClient, NextStep, Provider } from "../agents/types.js";

export const PROMPT_MAX_LENGTH = 2000;

export type AppOptions = Readonly<{
  client: ModelClient;
  provider: Provider;
  model: string;
  maxSteps: number;
}>;

export type ClientMessage =
  | Readonly<{ type: "prompt"; text: string }>
  | Readonly<{ type: "cancel" }>;

export type ServerMessage =
  | Readonly<{ type: "ready"; provider: Provider; model: string; maxSteps: number; promptMaxLength: number }>
  | Readonly<{ type: "event"; event: AgentEvent }>
  | Readonly<{
      type: "answer";
      text: string;
      blocked: boolean;
      stoppedByLimit: boolean;
      nextStep: NextStep | undefined;
    }>
  | Readonly<{ type: "cancelled" }>
  | Readonly<{ type: "error"; message: string }>;
