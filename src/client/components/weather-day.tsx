import { Cloud, CloudDrizzle, CloudFog, CloudLightning, CloudRain, CloudSnow, CloudSun, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { DailyForecast } from "../../agents/services/types.js";
import { weatherKind, weatherLabel, type WeatherKind } from "../lib/weather.js";

const weekday = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });
const dayMonth = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });

const weatherIcons: Readonly<Record<WeatherKind, ReactNode>> = {
  clear: <Sun className="size-5 text-[#d99a00]" aria-hidden="true" />,
  partly: <CloudSun className="size-5 text-[#d99a00]" aria-hidden="true" />,
  cloudy: <Cloud className="size-5 text-muted-foreground" aria-hidden="true" />,
  fog: <CloudFog className="size-5 text-muted-foreground" aria-hidden="true" />,
  drizzle: <CloudDrizzle className="size-5 text-lagoon-deep" aria-hidden="true" />,
  rain: <CloudRain className="size-5 text-lagoon-deep" aria-hidden="true" />,
  snow: <CloudSnow className="size-5 text-lagoon-deep" aria-hidden="true" />,
  storm: <CloudLightning className="size-5 text-pin-deep" aria-hidden="true" />,
};

const RAIN_CHANCE_TO_SHOW = 30;

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

export function formatDayMonth(isoDate: string): string {
  return dayMonth.format(toDate(isoDate)).replace(".", "").replace(" de ", " ");
}

type ForecastDayCardProps = Readonly<{ day: DailyForecast; withDate?: boolean }>;

export function ForecastDayCard({ day, withDate = false }: ForecastDayCardProps) {
  const kind = weatherKind(day.weatherCode);
  return (
    <li className="flex min-w-[4.75rem] flex-col items-center gap-1 rounded-[var(--radius-control)] border-[1.5px] border-border bg-card px-2 py-2.5">
      <span className="text-xs text-muted-foreground capitalize">{weekday.format(toDate(day.date)).replace(".", "")}</span>
      {withDate ? <span className="-mt-1 text-[11px] text-muted-foreground">{formatDayMonth(day.date)}</span> : null}
      <span title={weatherLabel[kind]}>
        {weatherIcons[kind]}
        <span className="sr-only">{weatherLabel[kind]}</span>
      </span>
      <span className="text-sm font-semibold tabular-nums text-ink">{Math.round(day.maxCelsius)}°</span>
      <span className="text-xs tabular-nums text-muted-foreground">{Math.round(day.minCelsius)}°</span>
      {day.rainChance !== undefined && day.rainChance >= RAIN_CHANCE_TO_SHOW ? (
        <span className="text-[11px] tabular-nums text-lagoon-deep">{day.rainChance}% chuva</span>
      ) : null}
    </li>
  );
}
