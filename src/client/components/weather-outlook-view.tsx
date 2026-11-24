import { CloudRain, CloudSun, History, Sun } from "lucide-react";
import type { ReactNode } from "react";
import type { WeatherOutlookBlock } from "../../agents/generative-ui/types.js";
import type { ClimateNormals, WeatherOutlookData } from "../../agents/services/types.js";
import { ForecastDayCard, formatDayMonth } from "./weather-day.js";

const RAINY_YEARS_FOR_RAIN = 4;
const RAINY_YEARS_FOR_SUN = 1;

type TypicalSky = Readonly<{ label: string; icon: ReactNode }>;

function typicalSky(rainyYears: number): TypicalSky {
  if (rainyYears >= RAINY_YEARS_FOR_RAIN) {
    return { label: "Costuma chover", icon: <CloudRain className="size-4 text-lagoon-deep" aria-hidden="true" /> };
  }
  if (rainyYears <= RAINY_YEARS_FOR_SUN) {
    return { label: "Costuma fazer tempo seco", icon: <Sun className="size-4 text-[#d99a00]" aria-hidden="true" /> };
  }
  return { label: "Tempo variável", icon: <CloudSun className="size-4 text-[#d99a00]" aria-hidden="true" /> };
}

const decimal = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

function rangeLabel(start: string, end: string): string {
  return start === end ? formatDayMonth(start) : `${formatDayMonth(start)} a ${formatDayMonth(end)}`;
}

function monthDayDate(monthDay: string, startDate: string): string {
  const startYear = Number(startDate.slice(0, 4));
  const candidate = `${startYear}-${monthDay}`;
  return candidate < startDate ? `${startYear + 1}-${monthDay}` : candidate;
}

function ClimateSummary({ climate, start, end }: { climate: ClimateNormals; start: string; end: string }) {
  const years = climate.toYear - climate.fromYear + 1;
  const low = Math.floor(Math.min(...climate.days.map((day) => day.averageMinCelsius))) - 1;
  const high = Math.ceil(Math.max(...climate.days.map((day) => day.averageMaxCelsius))) + 1;
  const span = Math.max(1, high - low);
  const position = (value: number): number => ((value - low) / span) * 100;

  const stats = [
    { label: "Máxima média", value: `${decimal.format(climate.averageMaxCelsius)} °C` },
    { label: "Mínima média", value: `${decimal.format(climate.averageMinCelsius)} °C` },
    { label: "Dias com chuva", value: `${Math.round(climate.rainyShare * 100)}%` },
    { label: "Chuva por dia", value: `${decimal.format(climate.averagePrecipitationMm)} mm` },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-lagoon-soft text-lagoon-deep">
          <History className="size-4" aria-hidden="true" />
        </span>
        <div className="flex flex-col gap-0.5">
          <h4 className="font-display text-base leading-6 font-semibold text-ink">Como costuma ser de {rangeLabel(start, end)}</h4>
          <p className="text-xs leading-5 text-muted-foreground">
            Média de {climate.fromYear} a {climate.toYear} para essas datas. Não é previsão: a previsão diária só sai 16 dias antes.
          </p>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="flex flex-col gap-0.5 rounded-[var(--radius-control)] bg-muted px-3 py-2.5">
            <dt className="text-xs text-muted-foreground">{stat.label}</dt>
            <dd className="text-base font-semibold tabular-nums text-ink">{stat.value}</dd>
          </div>
        ))}
      </dl>

      <ul className="flex flex-col gap-1.5" aria-label="Temperatura média por dia">
        {climate.days.map((day) => {
          const rainyYears = Math.round(day.rainyShare * years);
          const sky = typicalSky(rainyYears);
          return (
            <li key={day.monthDay} className="grid grid-cols-[3.75rem_1rem_2.25rem_1fr_2.25rem] items-center gap-2 text-sm sm:grid-cols-[3.75rem_1rem_2.25rem_1fr_2.25rem_8.5rem]">
              <span className="text-muted-foreground">{formatDayMonth(monthDayDate(day.monthDay, start))}</span>
              <span className="grid place-items-center" title={sky.label}>
                {sky.icon}
                <span className="sr-only">{sky.label}</span>
              </span>
              <span className="text-right tabular-nums text-muted-foreground">{Math.round(day.averageMinCelsius)}°</span>
              <span className="relative h-2 rounded-full bg-muted" aria-hidden="true">
                <span
                  className="absolute inset-y-0 rounded-full bg-gradient-to-r from-lagoon to-route"
                  style={{
                    left: `${position(day.averageMinCelsius)}%`,
                    right: `${100 - position(day.averageMaxCelsius)}%`,
                  }}
                />
              </span>
              <span className="tabular-nums font-medium text-ink">{Math.round(day.averageMaxCelsius)}°</span>
              <span className="col-span-5 -mt-1 text-xs text-muted-foreground sm:col-span-1 sm:mt-0">
                chove em {rainyYears} de {years} anos
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function OutlookContent({ outlook }: { outlook: WeatherOutlookData }) {
  const { forecastDays, climate, climateStartDate, climateEndDate } = outlook;
  const lastForecastDate = forecastDays[forecastDays.length - 1]?.date;
  const continuesWithClimate = climate !== undefined && lastForecastDate !== undefined;
  return (
    <>
      {forecastDays.length > 0 ? (
        <div className="flex flex-col gap-2">
          <div className="flex flex-col gap-0.5">
            <h4 className="font-display text-base font-semibold text-ink">Previsão</h4>
            {continuesWithClimate ? (
              <p className="text-xs leading-5 text-muted-foreground">
                A previsão diária cobre só os próximos 16 dias, por isso vai até {formatDayMonth(lastForecastDate)}. Os outros
                dias usam a média histórica abaixo.
              </p>
            ) : null}
          </div>
          <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {forecastDays.map((day) => (
              <ForecastDayCard key={day.date} day={day} withDate />
            ))}
          </ul>
        </div>
      ) : null}

      {climate && climateStartDate && climateEndDate ? (
        <ClimateSummary climate={climate} start={climateStartDate} end={climateEndDate} />
      ) : null}
    </>
  );
}

export function WeatherOutlookView({ block }: { block: WeatherOutlookBlock }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-0.5">
        <h3 className="font-display text-lg leading-6 font-semibold text-ink">Tempo em {block.city}</h3>
        <p className="text-sm text-muted-foreground">
          {rangeLabel(block.startDate, block.endDate)}, {block.country}
        </p>
      </div>
      <OutlookContent outlook={block} />
    </div>
  );
}
