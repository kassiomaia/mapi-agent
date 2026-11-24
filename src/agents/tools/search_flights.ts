import { z } from "zod";
import { searchWeb } from "../services/tavily.js";
import { defineTool } from "./define-tool.js";
import type { WebPage } from "../services/types.js";
import type { FlightOffer, FlightSearch, SearchFlightsInput } from "./types.js";

const MODEL_SNIPPET_LENGTH = 500;
const UI_SNIPPET_LENGTH = 240;
const MIN_PLAUSIBLE_FARE = 50;
const PRICE_PATTERN =
  /(?:R\$|US\$|USD|BRL|EUR|€|\$)\s?(\d{1,3}(?:[.,\s]\d{3})*)(?:,\d{2})?|(\d{1,3}(?:[.\s]\d{3})*)(?:,\d{2})?\s?(?:€|BRL|EUR|USD)/g;
const SEARCH_CANDIDATES = 10;
const FLIGHT_COMPARISON_DOMAINS = [
  "google.com",
  "kayak.com.br",
  "skyscanner.com.br",
  "momondo.com.br",
  "decolar.com",
  "edreams.com.br",
  "expedia.com.br",
  "kiwi.com",
  "cheapflights.com.br",
  "maxmilhas.com.br",
] as const;

const inputSchema = z.object({
  origin: z.string().trim().min(1).describe("Cidade de origem, por exemplo: São Paulo"),
  destination: z.string().trim().min(1).describe("Cidade de destino, por exemplo: Lisboa"),
  departureDate: z.iso.date().optional().describe("Data de ida no formato AAAA-MM-DD, se o usuário informar"),
  returnDate: z.iso.date().optional().describe("Data de volta no formato AAAA-MM-DD, se for ida e volta"),
  maxResults: z.number().int().min(1).max(10).default(6).describe("Quantidade máxima de páginas, de 1 a 10. Padrão: 6"),
});

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });
const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

function formatDate(isoDate: string, format: Intl.DateTimeFormat): string {
  return format.format(new Date(`${isoDate}T00:00:00Z`));
}

function buildQuery({ origin, destination, departureDate }: SearchFlightsInput): string {
  const month = departureDate ? ` ${formatDate(departureDate, monthFormat)}` : "";
  return `passagens aéreas de ${origin} para ${destination}${month}`;
}

function describeDates({ departureDate, returnDate }: SearchFlightsInput): string {
  if (!departureDate) return "sem datas";
  const departure = `ida ${formatDate(departureDate, dateFormat)}`;
  return returnDate ? `${departure}, volta ${formatDate(returnDate, dateFormat)}` : `${departure}, só ida`;
}

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

function mentions(page: WebPage, city: string): boolean {
  const haystack = normalize(`${page.title} ${page.url} ${page.content}`);
  return normalize(city)
    .split(/\s+/)
    .every((word) => haystack.includes(word));
}

function isReversedRoute(page: WebPage, input: SearchFlightsInput): boolean {
  const title = normalize(page.title);
  const origin = title.indexOf(normalize(input.origin));
  const destination = title.indexOf(normalize(input.destination));
  return origin !== -1 && destination !== -1 && destination < origin;
}

function titleMentions(page: WebPage, city: string): boolean {
  return normalize(page.title).includes(normalize(city));
}

function relevance(page: WebPage, input: SearchFlightsInput): number {
  if (isReversedRoute(page, input)) return 4;
  const destinationInTitle = titleMentions(page, input.destination);
  if (destinationInTitle && titleMentions(page, input.origin)) return 0;
  if (destinationInTitle) return 1;
  if (mentions(page, input.origin)) return 2;
  return 3;
}

const MAX_RANK_WITH_PRICE = 1;

type RankedPage = Readonly<{ page: WebPage; rank: number }>;

function relevantPages(pages: ReadonlyArray<WebPage>, input: SearchFlightsInput): ReadonlyArray<RankedPage> {
  return pages
    .filter((page) => mentions(page, input.destination))
    .map((page, index) => ({ page, index, rank: relevance(page, input) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ page, rank }) => ({ page, rank }))
    .slice(0, input.maxResults);
}

function fareValue(digits: string): number {
  return Number(digits.replace(/[.,\s]/g, ""));
}

function findPrice(...texts: ReadonlyArray<string>): string | undefined {
  for (const text of texts) {
    for (const match of text.matchAll(PRICE_PATTERN)) {
      const digits = match[1] ?? match[2] ?? "";
      if (fareValue(digits) >= MIN_PLAUSIBLE_FARE) {
        return match[0].replace(/\s+/g, " ").trim();
      }
    }
  }
  return undefined;
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

export async function searchFlights(input: SearchFlightsInput, signal?: AbortSignal): Promise<FlightSearch> {
  if (input.departureDate && input.returnDate && input.returnDate < input.departureDate) {
    throw new Error("The return date is before the departure date");
  }
  const query = buildQuery(input);
  const results = await searchWeb(query, {
    maxResults: SEARCH_CANDIDATES,
    includeDomains: FLIGHT_COMPARISON_DOMAINS,
    signal,
  });
  const pages = relevantPages(results, input);
  if (pages.length === 0) {
    throw new Error(`No flight results found for ${input.origin} → ${input.destination}`);
  }
  const offers: FlightOffer[] = pages.map(({ page, rank }) => ({
    ...page,
    price: rank <= MAX_RANK_WITH_PRICE ? findPrice(page.title, page.content) : undefined,
  }));
  return {
    origin: input.origin,
    destination: input.destination,
    departureDate: input.departureDate,
    returnDate: input.returnDate,
    query,
    dates: describeDates(input),
    offers,
  };
}

function formatOutput(result: FlightSearch): string {
  const offers = result.offers.map((offer, index) =>
    [
      `${index + 1}. ${offer.title} (${offer.site})`,
      `   Preço citado: ${offer.price ?? "não encontrado"}`,
      `   URL: ${offer.url}`,
      `   Trecho: ${truncate(offer.content, MODEL_SNIPPET_LENGTH)}`,
    ].join("\n"),
  );
  return [
    `Busca na web: "${result.query}" (${result.dates}). Os resultados foram exibidos ao usuário como uma lista de links.`,
    "Os preços vêm de páginas de comparadores de voos, valem para a rota em geral e não para as datas pedidas, " +
      "podem estar desatualizados e não são uma cotação.",
    ...offers,
  ].join("\n");
}

export const searchFlightsTool = defineTool({
  name: "search_flights",
  description:
    "Pesquisa na web (Tavily) passagens aéreas entre duas cidades, opcionalmente com datas de ida e volta. " +
    "Retorna páginas de comparadores de voos (Google Voos, KAYAK, Skyscanner, Decolar e outros) com o preço citado em cada uma, quando houver. " +
    "Os preços são referências da rota encontradas na web, não cotações em tempo real para as datas pedidas. " +
    "Os resultados são exibidos automaticamente ao usuário como uma lista de links.",
  inputSchema,
  execute: (input, context) => searchFlights(input, context.signal),
  formatOutput,
  present: (result) => ({
    title: `Passagens de ${result.origin} para ${result.destination}`,
    blocks: [
      {
        type: "web_results",
        query: result.query,
        note:
          "Preços encontrados em páginas de comparadores; valem para a rota, não para datas específicas, e podem estar desatualizados. Confirme no site antes de comprar.",
        results: result.offers.map((offer) => ({
          title: offer.title,
          url: offer.url,
          site: offer.site,
          snippet: truncate(offer.content, UI_SNIPPET_LENGTH),
          price: offer.price,
        })),
      },
    ],
  }),
});
