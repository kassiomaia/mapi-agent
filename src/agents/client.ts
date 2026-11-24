import Anthropic from "@anthropic-ai/sdk";
import AnthropicBedrock from "@anthropic-ai/bedrock-sdk";
import type { ModelClient, Provider } from "./types.js";

export function createClient(
  provider: Provider,
  env: Readonly<Record<string, string | undefined>>,
): ModelClient {
  if (provider === "bedrock") {
    const awsRegion = env.AWS_REGION ?? env.AWS_DEFAULT_REGION;
    if (!awsRegion) {
      throw new Error("Set AWS_REGION, for example us-east-1");
    }
    const token = env.AWS_BEARER_TOKEN_BEDROCK;
    return new AnthropicBedrock({
      awsRegion,
      ...(token ? { apiKey: token } : {}),
    });
  }

  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("Set ANTHROPIC_API_KEY in the .env file");
  }
  return new Anthropic({ apiKey });
}
