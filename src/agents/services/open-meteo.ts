import { z } from "zod";
import type { ClimateNormals, Forecast, Place } from "./types.js";

const GEOCODING_CANDIDATES = 10;

const geocodingResponseSchema = z.object({
  results: z
    .array(
      z.object({
        id: z.number().optional(),
        admin2_id: z.number().optional(),
        admin3_id: z.number().optional(),
        name: z.string(),
        latitude: z.number(),
        longitude: z.number(),
        country: z.string().optional(),
        population: z.number().optional(),
        feature_code: z.string().optional(),
      }),
    )
    .optional(),
});

type GeocodingCandidate = NonNullable<z.output<typeof geocodingResponseSchema>["results"]>[number];

export async function fetchJson<Schema extends z.ZodType>(
  url: URL,
  schema: Schema,
): Promise<z.output<Schema>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`Open-Meteo API responded with HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  return schema.parse(body);
}

function geocodingUrl(city: string): URL {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", String(GEOCODING_CANDIDATES));
  url.searchParams.set("language", "pt");
  return url;
}

function mostPopulous(candidates: ReadonlyArray<GeocodingCandidate>): GeocodingCandidate | undefined {
  return candidates.reduce<GeocodingCandidate | undefined>(
    (best, candidate) =>
      best === undefined || (candidate.population ?? 0) > (best.population ?? 0) ? candidate : best,
    undefined,
  );
}

const POPULATED_PLACE_PREFIX = "PPL";

function populatedPlaces(candidates: ReadonlyArray<GeocodingCandidate>): ReadonlyArray<GeocodingCandidate> {
  const places = candidates.filter((candidate) => candidate.feature_code?.startsWith(POPULATED_PLACE_PREFIX));
  return places.length > 0 ? places : candidates;
}

const FORECAST_DAYS = 7;

const forecastResponseSchema = z.object({
  timezone: z.string(),
  current: z.object({ time: z.string(), temperature_2m: z.number() }),
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number()),
    temperature_2m_min: z.array(z.number()),
    precipitation_probability_max: z.array(z.number().nullable()),
    weather_code: z.array(z.number()),
  }),
});

export async function fetchForecast(
  latitude: number,
  longitude: number,
  days: number = FORECAST_DAYS,
): Promise<Forecast> {
  const url = new URL("https://api.open-meteo.com/v1/forecast");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("current", "temperature_2m");
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code");
  url.searchParams.set("forecast_days", String(days));
  url.searchParams.set("timezone", "auto");
  const response = await fetchJson(url, forecastResponseSchema);
  const { daily } = response;
  return {
    currentCelsius: response.current.temperature_2m,
    observedAt: response.current.time,
    timezone: response.timezone,
    days: daily.time.map((date, index) => ({
      date,
      maxCelsius: daily.temperature_2m_max[index] ?? Number.NaN,
      minCelsius: daily.temperature_2m_min[index] ?? Number.NaN,
      rainChance: daily.precipitation_probability_max[index] ?? undefined,
      weatherCode: daily.weather_code[index] ?? 0,
    })),
  };
}

export const MAX_FORECAST_DAYS = 16;
const CLIMATE_YEARS = 10;
const RAINY_DAY_MM = 1;

const archiveResponseSchema = z.object({
  daily: z.object({
    time: z.array(z.string()),
    temperature_2m_max: z.array(z.number().nullable()),
    temperature_2m_min: z.array(z.number().nullable()),
    precipitation_sum: z.array(z.number().nullable()),
  }),
});

type DaySample = { max: number[]; min: number[]; precipitation: number[] };

function average(values: ReadonlyArray<number>): number {
  return values.length === 0 ? Number.NaN : values.reduce((sum, value) => sum + value, 0) / values.length;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

export async function fetchClimateNormals(
  latitude: number,
  longitude: number,
  monthDays: ReadonlyArray<string>,
): Promise<ClimateNormals> {
  const lastYear = new Date().getUTCFullYear() - 1;
  const fromYear = lastYear - CLIMATE_YEARS + 1;
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", `${fromYear}-01-01`);
  url.searchParams.set("end_date", `${lastYear}-12-31`);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("timezone", "auto");
  const { daily } = await fetchJson(url, archiveResponseSchema);

  const wanted = new Set(monthDays);
  const samples = new Map<string, DaySample>(monthDays.map((monthDay) => [monthDay, { max: [], min: [], precipitation: [] }]));
  daily.time.forEach((date, index) => {
    const monthDay = date.slice(5);
    if (!wanted.has(monthDay)) return;
    const sample = samples.get(monthDay);
    const max = daily.temperature_2m_max[index];
    const min = daily.temperature_2m_min[index];
    const precipitation = daily.precipitation_sum[index];
    if (!sample || max == null || min == null || precipitation == null) return;
    sample.max.push(max);
    sample.min.push(min);
    sample.precipitation.push(precipitation);
  });

  const all = [...samples.values()];
  const allPrecipitation = all.flatMap((sample) => sample.precipitation);
  if (allPrecipitation.length === 0) {
    throw new Error("No historical weather data for these dates");
  }
  return {
    fromYear,
    toYear: lastYear,
    days: monthDays.map((monthDay) => {
      const sample = samples.get(monthDay) ?? { max: [], min: [], precipitation: [] };
      return {
        monthDay,
        averageMaxCelsius: round1(average(sample.max)),
        averageMinCelsius: round1(average(sample.min)),
        rainyShare: average(sample.precipitation.map((mm) => (mm >= RAINY_DAY_MM ? 1 : 0))),
      };
    }),
    averageMaxCelsius: round1(average(all.flatMap((sample) => sample.max))),
    averageMinCelsius: round1(average(all.flatMap((sample) => sample.min))),
    rainyShare: average(allPrecipitation.map((mm) => (mm >= RAINY_DAY_MM ? 1 : 0))),
    averagePrecipitationMm: round1(average(allPrecipitation)),
  };
}

export async function geocodeCity(city: string): Promise<Place | undefined> {
  const response = await fetchJson(geocodingUrl(city), geocodingResponseSchema);
  const place = mostPopulous(populatedPlaces(response.results ?? []));
  if (!place) return undefined;
  return {
    name: place.name,
    country: place.country ?? "country not provided",
    latitude: place.latitude,
    longitude: place.longitude,
    geonamesIds: [place.id, place.admin3_id, place.admin2_id].filter((id) => id !== undefined),
  };
}
