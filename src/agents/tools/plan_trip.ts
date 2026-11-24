import { z } from "zod";
import { collectSources, composeTripPlan } from "../planner/compose.js";
import { createProgressTracker, type ProgressTracker } from "../planner/progress.js";
import { COMPOSE_STEP, ITEM_PHOTOS_STEP, PLAN_STEPS, researchTrip } from "../planner/research.js";
import type { PlanTripInput, TripPlan, TripPlanContent } from "../planner/types.js";
import { fetchWikipediaPhotos } from "../services/wikimedia.js";
import { defineTool } from "./define-tool.js";
import type { ToolContext } from "./types.js";

const inputSchema = z.object({
  destination: z.string().trim().min(1).describe("Cidade de destino, por exemplo: Lisboa"),
  origin: z.string().trim().min(1).optional().describe("Cidade de origem, se o usuário informar, por exemplo: São Paulo"),
  departureDate: z.iso.date().optional().describe("Data de ida no formato AAAA-MM-DD, se o usuário informar"),
  returnDate: z.iso.date().optional().describe("Data de volta no formato AAAA-MM-DD, se o usuário informar"),
  travelers: z.number().int().min(1).max(20).default(1).describe("Número de viajantes. Padrão: 1"),
  interests: z
    .array(z.string().trim().min(1))
    .max(6)
    .optional()
    .describe("Interesses do usuário, por exemplo: praia, museus, gastronomia, vida noturna"),
});

async function planTrip(input: PlanTripInput, context: ToolContext): Promise<TripPlan> {
  if (input.departureDate && input.returnDate && input.returnDate < input.departureDate) {
    throw new Error("The return date is before the departure date");
  }
  const tracker = createProgressTracker(`Plano para ${input.destination}`, PLAN_STEPS, context.reportProgress);
  const research = await researchTrip(input, tracker, context.signal);
  const content = await tracker.track(
    COMPOSE_STEP.id,
    () => composeTripPlan(context.client, context.model, research, context.signal),
    (plan) => `${plan.itinerary.length} dias de roteiro`,
  );
  const itemPhotos = await findItemPhotos(content, research.destination.city, tracker);
  return { research, content, itemPhotos, sources: collectSources(research) };
}

async function findItemPhotos(
  content: TripPlanContent,
  city: string,
  tracker: ProgressTracker,
): Promise<TripPlan["itemPhotos"]> {
  const titles = [...content.itinerary, ...content.attractions, ...content.food, ...content.neighborhoods].map((item) => item.wikipediaTitle);
  if (titles.length === 0) {
    tracker.skip(ITEM_PHOTOS_STEP.id, "sem itens com foto no plano");
    return {};
  }
  try {
    const photos = await tracker.track(
      ITEM_PHOTOS_STEP.id,
      () => fetchWikipediaPhotos(titles, city),
      (found) => `${found.size} de ${titles.length} fotos`,
    );
    return Object.fromEntries(photos);
  } catch {
    return {};
  }
}

function formatOutput({ research, content }: TripPlan): string {
  const highlights = content.attractions.slice(0, 4).map((attraction) => attraction.name).join(", ");
  const cheapest = research.flights?.cheapest;
  return [
    `Plano de viagem para ${research.destination.city} (${research.destination.country}) exibido ao usuário, com fotos, roteiro, atrações, comida, bairros, dicas e orçamento.`,
    `Resumo: ${content.tagline} ${content.summary}`,
    `Roteiro de ${content.itinerary.length} dias. Destaques: ${highlights}.`,
    research.forecast ? `Clima agora: ${Math.round(research.forecast.currentCelsius)} °C.` : "",
    cheapest ? `Passagens a partir de ${cheapest} (referência encontrada na web, não é cotação).` : "",
  ]
    .filter((line) => line !== "")
    .join("\n");
}

export const planTripTool = defineTool({
  name: "plan_trip",
  description:
    "Monta um plano de viagem completo para um destino: localização, clima e previsão, fotos, passagens e distância a partir da origem, " +
    "e pesquisas na web sobre o que ver, o que comer, onde ficar, dicas práticas, eventos no período e orçamento diário. " +
    "Depois organiza tudo em um roteiro dia a dia. O plano é exibido automaticamente ao usuário com fotos e seções. " +
    "Use quando o usuário pedir um plano, roteiro ou ajuda para organizar a viagem inteira. Leva alguns segundos.",
  inputSchema,
  execute: planTrip,
  formatOutput,
  present: ({ research, content, itemPhotos, sources }) => ({
    blocks: [
      {
        type: "trip_plan",
        destination: research.destination,
        origin: research.origin,
        distanceKm: research.distanceKm,
        departureDate: research.input.departureDate,
        returnDate: research.input.returnDate,
        travelers: research.input.travelers,
        timeDifference: research.timeDifference,
        photos: research.photos,
        forecast: research.forecast,
        outlook: research.outlook,
        flights: research.flights,
        content,
        itemPhotos,
        sources,
      },
    ],
  }),
});
