import type Anthropic from "@anthropic-ai/sdk";
import { describeOutlook } from "../services/weather-outlook.js";
import { toInputSchema } from "../tools/define-tool.js";
import type { ModelClient } from "../types.js";
import { tripPlanContentSchema } from "./schema.js";
import type { TripPlanContent, TripResearch, TripSource } from "./types.js";

const COMPOSE_TOOL_NAME = "compose_trip_plan";
const NOTE_CONTENT_LENGTH = 700;
const MAX_SOURCES = 12;
const LIMITS = { bestFor: 4, attractions: 8, food: 6, neighborhoods: 4, tips: 6, events: 4, packing: 8 } as const;

const composeTool: Anthropic.Tool = {
  name: COMPOSE_TOOL_NAME,
  description: "Registra o plano de viagem completo, já organizado para ser exibido ao usuário.",
  input_schema: toInputSchema(tripPlanContentSchema),
};

const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

function systemPrompt(days: number): string {
  return [
    "Você é Mapi, agente pessoal de planejamento de férias. Monte um plano de viagem completo a partir da pesquisa enviada.",
    `O roteiro deve ter exatamente ${days} dias, com manhã, tarde e noite em cada dia, agrupando atrações próximas no mesmo dia.`,
    "Use a pesquisa como fonte principal. Para atrações e pratos muito conhecidos do destino, você pode usar conhecimento geral consolidado.",
    "Nunca invente preços, datas de eventos, horários ou valores de câmbio que a pesquisa não traga; nesses casos, omita o campo ou a informação.",
    "Escreva em português do Brasil, em frases curtas, com tom caloroso e prático. Não use Markdown nem emojis.",
    `Responda chamando a ferramenta ${COMPOSE_TOOL_NAME} uma única vez.`,
  ].join("\n");
}

function describeTrip(research: TripResearch): string {
  const { input, destination, origin, distanceKm, forecast, flights } = research;
  const lines = [`Destino: ${destination.city}, ${destination.country}`];
  lines.push(
    origin
      ? `Origem: ${origin.city}, ${origin.country}${distanceKm ? ` (distância geodésica de ${Math.round(distanceKm)} km)` : ""}`
      : "Origem: não informada",
  );
  if (input.departureDate) {
    lines.push(
      `Datas: ida ${formatDate(input.departureDate)}${input.returnDate ? `, volta ${formatDate(input.returnDate)}` : ""}`,
    );
  } else {
    lines.push("Datas: não informadas");
  }
  lines.push(`Viajantes: ${input.travelers}`);
  if (research.timeDifference) lines.push(`Fuso horário: ${research.timeDifference}`);
  if (input.interests?.length) lines.push(`Interesses: ${input.interests.join(", ")}`);
  if (research.outlook) {
    lines.push(
      `Tempo nas datas da viagem (use para o roteiro e a mala):\n${describeOutlook(research.outlook).join("\n")}`,
    );
  } else if (forecast) {
    const days = forecast.days
      .map((day) => `${day.date}: ${Math.round(day.minCelsius)}–${Math.round(day.maxCelsius)} °C, chuva ${day.rainChance ?? "?"}%`)
      .join("; ");
    lines.push(`Clima agora: ${forecast.currentCelsius} °C. Previsão dos próximos dias: ${days}`);
  }
  if (flights) {
    const prices = flights.offers
      .map((offer) => `${offer.site}: ${offer.price ?? "sem preço"}`)
      .join("; ");
    lines.push(`Passagens (preços de referência encontrados na web): ${prices}`);
  }
  return lines.join("\n");
}

function describeNotes(research: TripResearch): string {
  return research.notes
    .map((note) => {
      const pages = note.pages
        .map((page, index) => `[${index + 1}] ${page.title} (${page.url})\n${page.content.slice(0, NOTE_CONTENT_LENGTH)}`)
        .join("\n");
      return `## ${note.topic.label}\n${pages || "(sem resultados)"}`;
    })
    .join("\n\n");
}

function limit(content: TripPlanContent, days: number): TripPlanContent {
  return {
    ...content,
    bestFor: content.bestFor.slice(0, LIMITS.bestFor),
    itinerary: content.itinerary.slice(0, days),
    attractions: content.attractions.slice(0, LIMITS.attractions),
    food: content.food.slice(0, LIMITS.food),
    neighborhoods: content.neighborhoods.slice(0, LIMITS.neighborhoods),
    tips: content.tips.slice(0, LIMITS.tips),
    events: content.events.slice(0, LIMITS.events),
    packing: content.packing.slice(0, LIMITS.packing),
  };
}

export function collectSources(research: TripResearch): ReadonlyArray<TripSource> {
  const seen = new Set<string>();
  const sources: TripSource[] = [];
  for (const page of research.notes.flatMap((note) => note.pages)) {
    if (seen.has(page.url)) continue;
    seen.add(page.url);
    sources.push({ title: page.title, url: page.url, site: page.site });
  }
  return sources.slice(0, MAX_SOURCES);
}

export async function composeTripPlan(
  client: ModelClient,
  model: string,
  research: TripResearch,
  signal: AbortSignal | undefined,
): Promise<TripPlanContent> {
  const response = await client.messages.create(
    {
      model,
      max_tokens: 8000,
      system: systemPrompt(research.days),
      tools: [composeTool],
      tool_choice: { type: "tool", name: COMPOSE_TOOL_NAME },
      thinking: { type: "disabled" },
      messages: [
        {
          role: "user",
          content: `<viagem>\n${describeTrip(research)}\n</viagem>\n<pesquisa>\n${describeNotes(research)}\n</pesquisa>`,
        },
      ],
    },
    signal ? { signal } : {},
  );

  const call = response.content.find((block) => block.type === "tool_use");
  if (!call) {
    throw new Error("The planner model did not return a plan");
  }
  const parsed = tripPlanContentSchema.safeParse(call.input);
  if (!parsed.success) {
    throw new Error(`The planner model returned an invalid plan: ${parsed.error.message}`);
  }
  return limit(parsed.data, research.days);
}
