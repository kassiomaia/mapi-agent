import { photoKey } from "../planner/photo-keys.js";
import type { TripPlan } from "../planner/types.js";
import type { Coordinates, DailyForecast, WeatherOutlookData } from "../services/types.js";
import type { Coordinates as CityCoordinates, DistanceResult, FlightSearch, ToolRecord, Weather, WeatherOutlook } from "./types.js";

type Point = Readonly<{ lat: number; lon: number }>;

export type SandboxData = Readonly<{
  plans: Readonly<Record<string, unknown>>;
  forecasts: Readonly<Record<string, unknown>>;
  flights: Readonly<Record<string, unknown>>;
  distances: ReadonlyArray<unknown>;
  places: Readonly<Record<string, unknown>>;
  weatherNow: Readonly<Record<string, unknown>>;
}>;

export function cityKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function point(coordinates: Coordinates | undefined): Point | Record<string, never> {
  return coordinates ? { lat: coordinates.latitude, lon: coordinates.longitude } : {};
}

function daysOf(forecast: ReadonlyArray<DailyForecast>) {
  return forecast.map((day) => ({
    date: day.date,
    maxC: day.maxCelsius,
    minC: day.minCelsius,
    rainChance: day.rainChance ?? null,
  }));
}

function weatherOf(outlook: WeatherOutlookData) {
  return {
    startDate: outlook.startDate,
    endDate: outlook.endDate,
    forecast: daysOf(outlook.forecastDays),
    climate: outlook.climate
      ? {
          years: `${outlook.climate.fromYear}-${outlook.climate.toYear}`,
          days: outlook.climate.days.map((day) => ({
            monthDay: day.monthDay,
            maxC: day.averageMaxCelsius,
            minC: day.averageMinCelsius,
            rainyShare: day.rainyShare,
          })),
          averageMaxC: outlook.climate.averageMaxCelsius,
          averageMinC: outlook.climate.averageMinCelsius,
          rainyShare: outlook.climate.rainyShare,
          averagePrecipitationMm: outlook.climate.averagePrecipitationMm,
        }
      : null,
  };
}

function nightsBetween(from: string | undefined, to: string | undefined): number | null {
  if (!from || !to) return null;
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

function planOf({ research, content, itemCoordinates }: TripPlan) {
  const { input, destination, origin } = research;
  const at = (section: "attractions" | "neighborhoods" | "itinerary", index: number) =>
    point(itemCoordinates[photoKey(section, index)]);
  return {
    city: destination.city,
    country: destination.country,
    lat: destination.latitude,
    lon: destination.longitude,
    origin: origin ? { city: origin.city, country: origin.country, lat: origin.latitude, lon: origin.longitude } : null,
    distanceFromOriginKm: research.distanceKm ?? null,
    timeDifference: research.timeDifference ?? null,
    departureDate: input.departureDate ?? null,
    returnDate: input.returnDate ?? null,
    nights: nightsBetween(input.departureDate, input.returnDate),
    days: research.days,
    travelers: input.travelers,
    interests: input.interests ?? [],
    currency: content.facts.currency ?? null,
    attractions: content.attractions.map((item, index) => ({ name: item.name, ...at("attractions", index) })),
    neighborhoods: content.neighborhoods.map((item, index) => ({
      name: item.name,
      goodFor: item.goodFor,
      ...at("neighborhoods", index),
    })),
    itinerary: content.itinerary.map((item, index) => ({
      day: item.day,
      title: item.title,
      place: item.wikipediaTitle,
      ...at("itinerary", index),
    })),
    food: content.food.map((item) => item.name),
    budgetPerPersonPerDay: content.budget ?? null,
    flights: research.flights
      ? {
          cheapest: research.flights.cheapest ?? null,
          offers: research.flights.offers.map((offer) => ({ site: offer.site, price: offer.price ?? null })),
        }
      : null,
    weather: research.outlook ? weatherOf(research.outlook) : null,
  };
}

function flightsOf(search: FlightSearch) {
  return {
    origin: search.origin,
    destination: search.destination,
    departureDate: search.departureDate ?? null,
    returnDate: search.returnDate ?? null,
    offers: search.offers.map((offer) => ({ site: offer.site, title: offer.title, price: offer.price ?? null })),
  };
}

// Turns the raw outputs of the tools that already ran into the read-only `data` global of the sandbox.
// Only what helps calculations goes in: no photos, links or long texts.
export function buildSandboxData(records: ReadonlyArray<ToolRecord>): SandboxData {
  const plans: Record<string, unknown> = {};
  const forecasts: Record<string, unknown> = {};
  const flights: Record<string, unknown> = {};
  const places: Record<string, unknown> = {};
  const weatherNow: Record<string, unknown> = {};
  const distances = new Map<string, unknown>();

  for (const record of records) {
    switch (record.tool) {
      case "plan_trip": {
        const plan = record.output as TripPlan;
        plans[cityKey(plan.research.destination.city)] = planOf(plan);
        break;
      }
      case "get_forecast": {
        const outlook = record.output as WeatherOutlook;
        forecasts[cityKey(outlook.city)] = { city: outlook.city, country: outlook.country, ...weatherOf(outlook) };
        break;
      }
      case "search_flights": {
        const search = record.output as FlightSearch;
        flights[`${cityKey(search.origin)}→${cityKey(search.destination)}`] = flightsOf(search);
        break;
      }
      case "calculate_distance": {
        const result = record.output as DistanceResult;
        for (const place of result.places) {
          places[cityKey(place.city)] = { city: place.city, country: place.country, lat: place.latitude, lon: place.longitude };
        }
        for (const pair of result.pairs) {
          distances.set(`${pair.from}→${pair.to}`, { from: pair.from, to: pair.to, km: pair.kilometers });
        }
        break;
      }
      case "get_coordinates": {
        const place = record.output as CityCoordinates;
        places[cityKey(place.city)] = { city: place.city, country: place.country, lat: place.latitude, lon: place.longitude };
        break;
      }
      case "get_weather": {
        const weather = record.output as Weather;
        weatherNow[cityKey(weather.city)] = { city: weather.city, celsius: weather.temperatureCelsius, observedAt: weather.observedAt };
        break;
      }
      default:
        break;
    }
  }

  return { plans, forecasts, flights, distances: [...distances.values()], places, weatherNow };
}

// One line per group, so the model knows which keys exist when its code misses one.
export function describeSandboxData(data: SandboxData): string {
  const keys = (group: Readonly<Record<string, unknown>>): string => Object.keys(group).join(", ") || "vazio";
  return [
    `plans: ${keys(data.plans)}`,
    `forecasts: ${keys(data.forecasts)}`,
    `flights: ${keys(data.flights)}`,
    `distances: ${data.distances.length} pares`,
    `places: ${keys(data.places)}`,
    `weatherNow: ${keys(data.weatherNow)}`,
  ].join("; ");
}
