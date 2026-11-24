import { fetchClimateNormals, fetchForecast, MAX_FORECAST_DAYS } from "./open-meteo.js";
import type { Forecast, WeatherOutlookData } from "./types.js";

export const MAX_OUTLOOK_DAYS = 31;
const MS_PER_DAY = 86_400_000;

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });
const dateFormat = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" });

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function addDays(isoDate: string, days: number): string {
  return new Date(Date.parse(`${isoDate}T00:00:00Z`) + days * MS_PER_DAY).toISOString().slice(0, 10);
}

export function datesBetween(start: string, end: string): ReadonlyArray<string> {
  const dates: string[] = [];
  for (let date = start; date <= end; date = addDays(date, 1)) dates.push(date);
  return dates;
}

function formatDate(isoDate: string): string {
  return dateFormat.format(new Date(`${isoDate}T00:00:00Z`));
}

export async function fetchWeatherOutlook(
  latitude: number,
  longitude: number,
  start: string,
  end: string,
  forecast?: Forecast,
): Promise<WeatherOutlookData> {
  const dates = datesBetween(start, end);
  const lastForecastDate = addDays(todayIso(), MAX_FORECAST_DAYS - 1);
  const forecastDates = new Set(dates.filter((date) => date <= lastForecastDate));
  const climateDates = dates.filter((date) => date > lastForecastDate);
  const coversForecast = forecast !== undefined && [...forecastDates].every((date) => forecast.days.some((day) => day.date === date));

  const [dailyForecast, climate] = await Promise.all([
    forecastDates.size === 0
      ? Promise.resolve(undefined)
      : coversForecast
        ? Promise.resolve(forecast)
        : fetchForecast(latitude, longitude, MAX_FORECAST_DAYS),
    climateDates.length > 0
      ? fetchClimateNormals(latitude, longitude, climateDates.map((date) => date.slice(5)))
      : Promise.resolve(undefined),
  ]);

  return {
    startDate: start,
    endDate: end,
    forecastDays: dailyForecast?.days.filter((day) => forecastDates.has(day.date)) ?? [],
    climateStartDate: climateDates[0],
    climateEndDate: climateDates[climateDates.length - 1],
    climate,
  };
}

export function describeOutlook(outlook: WeatherOutlookData): ReadonlyArray<string> {
  const lines: string[] = [];
  if (outlook.forecastDays.length > 0) {
    lines.push("Previsão (Open-Meteo):");
    for (const day of outlook.forecastDays) {
      const rain = day.rainChance === undefined ? "" : `, chance de chuva ${day.rainChance}%`;
      lines.push(`- ${formatDate(day.date)}: mínima ${Math.round(day.minCelsius)} °C, máxima ${Math.round(day.maxCelsius)} °C${rain}`);
    }
  }
  if (outlook.climate && outlook.climateStartDate && outlook.climateEndDate) {
    const { climate } = outlook;
    lines.push(
      `Média histórica de ${climate.fromYear} a ${climate.toYear} para ${formatDate(outlook.climateStartDate)} a ${formatDate(outlook.climateEndDate)} ` +
        `(datas além do alcance da previsão, que é de ${MAX_FORECAST_DAYS} dias; não é uma previsão): ` +
        `máximas de ${decimal.format(climate.averageMaxCelsius)} °C e mínimas de ${decimal.format(climate.averageMinCelsius)} °C em média, ` +
        `chuva de pelo menos 1 mm em ${Math.round(climate.rainyShare * 100)}% dos dias, ${decimal.format(climate.averagePrecipitationMm)} mm por dia em média.`,
    );
  }
  return lines;
}

export function describePeriod(start: string, end: string): string {
  return `${formatDate(start)} a ${formatDate(end)}`;
}
