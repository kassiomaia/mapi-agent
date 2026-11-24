import type { Config, Provider } from "./types.js";

export function loadConfig(env: Readonly<Record<string, string | undefined>>): Config {
  const provider: Provider = env.ANTHROPIC_PROVIDER === "bedrock" ? "bedrock" : "anthropic";
  const defaultModel = provider === "bedrock" ? "global.anthropic.claude-haiku-5-5" : "claude-haiku-5-5";
  const maxSteps = Number(env.AGENT_MAX_STEPS ?? "8");

  if (!Number.isInteger(maxSteps) || maxSteps < 1) {
    throw new Error("AGENT_MAX_STEPS must be an integer greater than or equal to 1");
  }

  const port = Number(env.PORT ?? "3000");
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be an integer between 1 and 65535");
  }

  return Object.freeze({
    provider,
    model: env.ANTHROPIC_MODEL ?? defaultModel,
    maxSteps,
    port,
  });
}
