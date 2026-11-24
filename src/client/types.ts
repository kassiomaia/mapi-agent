import type { UiSpec } from "../agents/generative-ui/types.js";
import type { NextStep, Provider, ToolProgress } from "../agents/types.js";

export type ConnectionStatus = "connecting" | "ready" | "busy" | "disconnected";

export type ActivityEntry =
  | Readonly<{ id: string; kind: "thinking"; text: string }>
  | Readonly<{
      id: string;
      kind: "tool";
      name: string;
      input: unknown;
      output: string | undefined;
      isError: boolean;
    }>;

export type TurnStatus = "working" | "complete" | "cancelled" | "failed";

export type NextStepChoice = "pending" | "accepted" | "declined";

export type ProgressEntry = Readonly<{
  toolUseId: string;
  name: string;
  progress: ToolProgress;
}>;

export type Turn = Readonly<{
  id: number;
  prompt: string;
  status: TurnStatus;
  activity: ReadonlyArray<ActivityEntry>;
  progress: ReadonlyArray<ProgressEntry>;
  interfaces: ReadonlyArray<UiSpec>;
  answer: string | undefined;
  guardrail: string | undefined;
  error: string | undefined;
  stoppedByLimit: boolean;
  nextStep: NextStep | undefined;
  nextStepChoice: NextStepChoice;
  startedAt: number;
  finishedAt: number | undefined;
}>;

export type SessionInfo = Readonly<{
  provider: Provider;
  model: string;
  promptMaxLength: number;
}>;

export type ChatSocket = Readonly<{
  turns: ReadonlyArray<Turn>;
  status: ConnectionStatus;
  session: SessionInfo | undefined;
  send: (text: string) => void;
  cancel: () => void;
  answerNextStep: (turnId: number, accepted: boolean) => void;
}>;
