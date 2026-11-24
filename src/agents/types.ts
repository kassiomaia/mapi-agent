import type Anthropic from "@anthropic-ai/sdk";
import type AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import type { UiSpec } from "./generative-ui/types.js";
import type { ToolRecord } from "./tools/types.js";

export type Provider = "anthropic" | "bedrock";

export type Config = Readonly<{
  provider: Provider;
  model: string;
  maxSteps: number;
  port: number;
}>;

export type ModelClient = Anthropic | AnthropicBedrock;

export type ProgressStepStatus = "pending" | "running" | "done" | "skipped" | "failed";

export type ProgressStep = Readonly<{
  id: string;
  label: string;
  status: ProgressStepStatus;
  detail?: string | undefined;
}>;

export type ToolProgress = Readonly<{
  title: string;
  steps: ReadonlyArray<ProgressStep>;
}>;

export type AgentEvent =
  | Readonly<{ type: "thinking"; text: string }>
  | Readonly<{ type: "tool"; name: string; input: unknown }>
  | Readonly<{ type: "result"; name: string; output: string; isError: boolean }>
  | Readonly<{ type: "guardrail"; reason: string }>
  | Readonly<{ type: "ui"; spec: UiSpec }>
  | Readonly<{ type: "progress"; toolUseId: string; name: string; progress: ToolProgress }>;

export type NextStep = Readonly<{
  question: string;
  confirmPrompt: string;
}>;

export type AgentResult = Readonly<{
  text: string;
  nextStep: NextStep | undefined;
  steps: number;
  stoppedByLimit: boolean;
  blocked: boolean;
  inputTokens: number;
  outputTokens: number;
}>;

export type AgentOptions = Readonly<{
  client: ModelClient;
  model: string;
  maxSteps: number;
  onEvent: (event: AgentEvent) => void;
  signal?: AbortSignal | undefined;
  toolResults?: ToolRecord[] | undefined;
}>;

export type ChatOptions = Readonly<{
  client: ModelClient;
  model: string;
  maxSteps: number;
}>;

export type Chat = Readonly<{
  ask: (
    prompt: string,
    onEvent: (event: AgentEvent) => void,
    signal?: AbortSignal,
  ) => Promise<AgentResult>;
}>;

export type ScopeDecision = Readonly<{
  allowed: boolean;
  reason: string;
}>;
