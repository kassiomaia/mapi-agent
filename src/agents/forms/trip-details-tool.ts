import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { TripDetailsFormBlock } from "../generative-ui/types.js";
import { toInputSchema } from "../tools/define-tool.js";

export const REQUEST_TRIP_DETAILS_TOOL_NAME = "request_trip_details";

const tripDetailsSchema = z.object({
  purpose: z
    .enum(["plan", "flights"])
    .describe("plan para montar o plano completo da viagem; flights para pesquisar passagens"),
  destination: z.string().trim().min(1).optional().describe("Cidade de destino, se o usuário já disse"),
  origin: z.string().trim().min(1).optional().describe("Cidade de origem, se o usuário já disse"),
  departureDate: z.iso.date().optional().describe("Sugestão de data de ida no formato AAAA-MM-DD, se o usuário deu alguma pista"),
  returnDate: z.iso.date().optional().describe("Sugestão de data de volta no formato AAAA-MM-DD, se o usuário deu alguma pista"),
  travelers: z.number().int().min(1).max(20).optional().describe("Número de viajantes, se o usuário já disse"),
  interests: z.array(z.string().trim().min(1)).max(6).optional().describe("Interesses que o usuário já citou"),
});

export const requestTripDetailsTool: Anthropic.Tool = {
  name: REQUEST_TRIP_DETAILS_TOOL_NAME,
  description:
    "Mostra ao usuário um formulário com calendário para escolher o período da viagem, o número de viajantes, " +
    "a origem e os interesses. Use antes de plan_trip ou search_flights quando o usuário ainda não informou as datas " +
    "de ida e volta ou quantas pessoas vão viajar. Preencha os campos que já souber. " +
    "Depois de chamar esta ferramenta, não chame nenhuma outra: a conversa pausa até o usuário enviar o formulário.",
  input_schema: toInputSchema(tripDetailsSchema),
};

export type TripDetailsParseResult =
  | Readonly<{ ok: true; block: TripDetailsFormBlock }>
  | Readonly<{ ok: false; error: string }>;

export function parseTripDetailsRequest(input: unknown): TripDetailsParseResult {
  const result = tripDetailsSchema.safeParse(input);
  if (!result.success) {
    return { ok: false, error: `Invalid trip details request: ${result.error.message}` };
  }
  const data = result.data;
  return {
    ok: true,
    block: {
      type: "trip_details_form",
      purpose: data.purpose,
      destination: data.destination,
      origin: data.origin,
      departureDate: data.departureDate,
      returnDate: data.returnDate,
      travelers: data.travelers,
      interests: data.interests,
    },
  };
}
