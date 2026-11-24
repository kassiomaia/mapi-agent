import { z } from "zod";
import { geocodeCity } from "../services/open-meteo.js";
import {
  addDays,
  datesBetween,
  describeOutlook,
  describePeriod,
  fetchWeatherOutlook,
  MAX_OUTLOOK_DAYS,
  todayIso,
} from "../services/weather-outlook.js";
import { defineTool } from "./define-tool.js";
import type { GetForecastInput, WeatherOutlook } from "./types.js";

const DEFAULT_SPAN_DAYS = 7;

const inputSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .describe("Nome da cidade. Para nomes ambíguos ou traduzidos, use o nome em inglês ou no idioma local, por exemplo: New York, Lisboa"),
  startDate: z.iso.date().optional().describe("Primeiro dia do período, no formato AAAA-MM-DD. Padrão: hoje"),
  endDate: z.iso.date().optional().describe("Último dia do período, no formato AAAA-MM-DD, até 31 dias depois do início. Padrão: 7 dias"),
});

async function getForecast(input: GetForecastInput): Promise<WeatherOutlook> {
  const today = todayIso();
  const start = input.startDate ?? today;
  const end = input.endDate ?? addDays(start, DEFAULT_SPAN_DAYS - 1);
  if (start < today) throw new Error("The period must start today or later");
  if (end < start) throw new Error("The end date is before the start date");
  if (datesBetween(start, end).length > MAX_OUTLOOK_DAYS) {
    throw new Error(`The period can have at most ${MAX_OUTLOOK_DAYS} days`);
  }

  const place = await geocodeCity(input.city);
  if (!place) throw new Error(`City not found: ${input.city}`);

  const outlook = await fetchWeatherOutlook(place.latitude, place.longitude, start, end);
  return { city: place.name, country: place.country, ...outlook };
}

function formatOutput(outlook: WeatherOutlook): string {
  return [
    `Tempo em ${outlook.city} (${outlook.country}) de ${describePeriod(outlook.startDate, outlook.endDate)}, exibido ao usuário.`,
    ...describeOutlook(outlook),
  ].join("\n");
}

export const getForecastTool = defineTool({
  name: "get_forecast",
  description:
    "Retorna o tempo esperado em uma cidade para um período de até 31 dias. Para os próximos 16 dias, traz a previsão diária " +
    "(máxima, mínima, chance de chuva). Para datas mais distantes, traz a média histórica dos últimos 10 anos para as mesmas datas, " +
    "que indica o clima típico, mas não é previsão. O resultado é exibido ao usuário automaticamente.",
  inputSchema,
  execute: getForecast,
  formatOutput,
  present: (outlook) => ({ blocks: [{ type: "weather_outlook", ...outlook }] }),
});
