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

const REQUEST_TIMEOUT_MS = 8_000;
const RETRY_DELAY_MS = 500;

export class WeatherServiceUnavailableError extends Error {
  constructor(cause: unknown) {
    super(
      "The weather service did not respond, even after one retry. Do not call this tool again for the same city and dates in this turn: " +
        "answer with the data you already have and tell the user the weather for this city is unavailable right now.",
      { cause },
    );
    this.name = "WeatherServiceUnavailableError";
  }
}

class HttpStatusError extends Error {
  constructor(readonly status: number) {
    super(`Open-Meteo API responded with HTTP ${status}`);
  }
}

function isTransient(error: unknown): boolean {
  if (error instanceof HttpStatusError) return error.status === 429 || error.status >= 500;
  return error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError" || error.name === "TypeError");
}

async function fetchOnce<Schema extends z.ZodType>(url: URL, schema: Schema): Promise<z.output<Schema>> {
  const response = await fetch(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) throw new HttpStatusError(response.status);
  const body: unknown = await response.json();
  return schema.parse(body);
}

/** Fetches JSON with a per-request timeout and at most one retry on timeouts, network errors, HTTP 429 and 5xx. */
export async function fetchJson<Schema extends z.ZodType>(
  url: URL,
  schema: Schema,
): Promise<z.output<Schema>> {
  try {
    return await fetchOnce(url, schema);
  } catch (error) {
    if (!isTransient(error)) throw error;
  }
  await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
  try {
    return await fetchOnce(url, schema);
  } catch (error) {
    throw isTransient(error) ? new WeatherServiceUnavailableError(error) : error;
  }
}

function geocodingUrl(city: string, countryCode: string | undefined): URL {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.searchParams.set("name", city);
  url.searchParams.set("count", String(GEOCODING_CANDIDATES));
  url.searchParams.set("language", "pt");
  if (countryCode) url.searchParams.set("countryCode", countryCode.toUpperCase());
  return url;
}

function normalizeName(name: string): string {
  return name.normalize("NFD").replace(/\p{Diacritic}/gu, "").trim().toLowerCase();
}

/** Prefers candidates whose name is exactly the query (ignoring case and accents), so "Porto" is not resolved to "Porto Alegre". */
function exactMatches(candidates: ReadonlyArray<GeocodingCandidate>, city: string): ReadonlyArray<GeocodingCandidate> {
  const wanted = normalizeName(city);
  const matches = candidates.filter((candidate) => normalizeName(candidate.name) === wanted);
  return matches.length > 0 ? matches : candidates;
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

const MS_PER_DAY = 86_400_000;
/** The archive (ERA5) lags a few days behind today. */
const ARCHIVE_LAG_DAYS = 7;
/** Below this many years answered, the average is not worth showing. */
const MIN_CLIMATE_YEARS = 5;

function shiftYears(isoDate: string, years: number): string {
  const [year, month, day] = isoDate.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(year + years, month - 1, day)).toISOString().slice(0, 10);
}

type ArchiveDaily = z.output<typeof archiveResponseSchema>["daily"];

const archiveCache = new Map<string, Promise<ArchiveDaily>>();

/**
 * Fetches only the requested window of one past year. Asking the archive for ten full years at once often takes over a minute,
 * while a window of a few weeks answers in a couple of seconds. Results are cached so repeated calls cost nothing.
 */
function fetchArchiveWindow(latitude: number, longitude: number, start: string, end: string): Promise<ArchiveDaily> {
  const key = `${latitude.toFixed(2)},${longitude.toFixed(2)},${start},${end}`;
  const cached = archiveCache.get(key);
  if (cached) return cached;
  const url = new URL("https://archive-api.open-meteo.com/v1/archive");
  url.searchParams.set("latitude", String(latitude));
  url.searchParams.set("longitude", String(longitude));
  url.searchParams.set("start_date", start);
  url.searchParams.set("end_date", end);
  url.searchParams.set("daily", "temperature_2m_max,temperature_2m_min,precipitation_sum");
  url.searchParams.set("timezone", "auto");
  const request = fetchJson(url, archiveResponseSchema).then(({ daily }) => daily);
  archiveCache.set(key, request);
  request.catch(() => archiveCache.delete(key));
  return request;
}

/** Averages the same calendar dates over the last ten years with archive data, given consecutive ISO dates. */
export async function fetchClimateNormals(
  latitude: number,
  longitude: number,
  dates: ReadonlyArray<string>,
): Promise<ClimateNormals> {
  const first = dates[0];
  const last = dates[dates.length - 1];
  if (first === undefined || last === undefined) throw new Error("No dates to average");
  const monthDays = dates.map((date) => date.slice(5));
  const archiveEnd = new Date(Date.now() - ARCHIVE_LAG_DAYS * MS_PER_DAY).toISOString().slice(0, 10);
  const firstYear = Number(first.slice(0, 4));
  const yearsBack: number[] = [];
  for (let back = 1; yearsBack.length < CLIMATE_YEARS; back++) {
    if (shiftYears(last, -back) <= archiveEnd) yearsBack.push(back);
  }

  const windows = await Promise.allSettled(
    yearsBack.map((back) => fetchArchiveWindow(latitude, longitude, shiftYears(first, -back), shiftYears(last, -back))),
  );
  const answered = yearsBack.filter((_, index) => windows[index]?.status === "fulfilled").map((back) => firstYear - back);
  if (answered.length < MIN_CLIMATE_YEARS) {
    const failure = windows.find((window) => window.status === "rejected");
    throw failure?.reason ?? new Error("No historical weather data for these dates");
  }
  const daily: ArchiveDaily = { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [] };
  for (const window of windows) {
    if (window.status !== "fulfilled") continue;
    daily.time.push(...window.value.time);
    daily.temperature_2m_max.push(...window.value.temperature_2m_max);
    daily.temperature_2m_min.push(...window.value.temperature_2m_min);
    daily.precipitation_sum.push(...window.value.precipitation_sum);
  }
  const fromYear = Math.min(...answered);
  const toYear = Math.max(...answered);

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
    toYear,
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

export async function geocodeCity(city: string, countryCode?: string): Promise<Place | undefined> {
  const response = await fetchJson(geocodingUrl(city, countryCode), geocodingResponseSchema);
  const place = mostPopulous(exactMatches(populatedPlaces(response.results ?? []), city));
  if (!place) return undefined;
  return {
    name: place.name,
    country: place.country ?? "country not provided",
    latitude: place.latitude,
    longitude: place.longitude,
    geonamesIds: [place.id, place.admin3_id, place.admin2_id].filter((id) => id !== undefined),
  };
}
