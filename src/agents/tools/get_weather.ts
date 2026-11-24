import { z } from "zod";
import { fetchJson, geocodeCity } from "../services/open-meteo.js";
import { defineTool } from "./define-tool.js";
import type { GetWeatherInput, Weather } from "./types.js";

const inputSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .describe("Nome da cidade. Para nomes ambíguos ou traduzidos, use o nome em inglês ou no idioma local, por exemplo: New York, Lisboa"),
});

const forecastResponseSchema = z.object({
  current: z.object({
    time: z.string(),
    temperature_2m: z.number(),
  }),
});

function forecastUrl(latitude: number, longitude: number): URL {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m");
  return url;
}

async function getWeather({ city }: GetWeatherInput): Promise<Weather> {
  const place = await geocodeCity(city);
  if (!place) {
    throw new Error(`City not found: ${city}`);
  }
  const forecast = await fetchJson(forecastUrl(place.latitude, place.longitude), forecastResponseSchema);
  return {
    city: place.name,
    country: place.country,
    temperatureCelsius: forecast.current.temperature_2m,
    observedAt: forecast.current.time,
  };
}

export const getWeatherTool = defineTool({
  name: "get_weather",
  description:
    "Retorna a temperatura atual em graus Celsius de uma cidade, usando a API Open-Meteo. Para o tempo em outras datas, use get_forecast.",
  inputSchema,
  execute: getWeather,
  formatOutput: (weather) =>
    `${weather.city} (${weather.country}): ${weather.temperatureCelsius} °C, observado em ${weather.observedAt}`,
});
