import { z } from "zod";
import type { WebPage } from "./types.js";

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";

const searchResponseSchema = z.object({
  results: z.array(
    z.object({
      title: z.string(),
      url: z.string(),
      content: z.string(),
    }),
  ),
});

export type WebSearchOptions = Readonly<{
  maxResults: number;
  includeDomains?: ReadonlyArray<string> | undefined;
  signal?: AbortSignal | undefined;
}>;

function apiKey(): string {
  const key = process.env.TAVILY?.trim();
  if (!key) {
    throw new Error("Web search is not configured: set TAVILY in .env");
  }
  return key;
}

function siteOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

const LANGUAGE_MENU = /(?:[\p{L}][\p{L}\s.]{1,30}\s*\([\p{L}\s.]{2,30}\)\s*[-–|·]\s*){2,}(?:[\p{L}][\p{L}\s.]{1,30}\s*\([\p{L}\s.]{2,30}\))?/gu;

function cleanContent(text: string): string {
  return text
    .replace(LANGUAGE_MENU, " ")
    .replace(/(?:\[(?:\.\.\.|…)\]\s*[-–|]?\s*)+/g, " ")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/<iframe[^>]*>?/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/[#|*_\\]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export async function searchWeb(query: string, options: WebSearchOptions): Promise<ReadonlyArray<WebPage>> {
  const response = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      search_depth: "basic",
      max_results: options.maxResults,
      include_answer: false,
      ...(options.includeDomains ? { include_domains: options.includeDomains } : {}),
    }),
    signal: options.signal
      ? AbortSignal.any([options.signal, AbortSignal.timeout(20_000)])
      : AbortSignal.timeout(20_000),
  });
  if (response.status === 401) {
    throw new Error("Tavily rejected the API key in TAVILY");
  }
  if (response.status === 429 || response.status === 432) {
    throw new Error("Tavily usage limit reached; try again later");
  }
  if (!response.ok) {
    throw new Error(`Tavily API responded with HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  return searchResponseSchema.parse(body).results.map((result) => ({
    title: result.title.trim(),
    url: result.url,
    site: siteOf(result.url),
    content: cleanContent(result.content),
  }));
}
