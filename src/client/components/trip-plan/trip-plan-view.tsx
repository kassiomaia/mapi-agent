import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { ArrowUpRight, Plane } from "lucide-react";
import type { ReactNode } from "react";
import type { TripPlanBlock } from "../../../agents/generative-ui/types.js";
import { GalleryView } from "../gallery-view.js";
import { ForecastDayCard } from "../weather-day.js";
import { OutlookContent } from "../weather-outlook-view.js";
import {
  AttractionsSection,
  CostsSection,
  FoodSection,
  ItinerarySection,
  StaySection,
  TipsSection,
} from "./trip-plan-sections.js";

const shortDate = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const kilometers = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function Hero({ block }: { block: TripPlanBlock }) {
  const cover = block.photos[0];
  const { destination, content } = block;
  if (!cover) {
    return (
      <div className="flex flex-col gap-1 rounded-t-[calc(var(--radius-card)-2px)] bg-lagoon-soft px-5 pt-6 pb-5">
        <h3 className="font-display text-4xl leading-none font-semibold text-ink">{destination.city}</h3>
        <p className="text-sm text-ink/80">{destination.country}</p>
        <p className="mt-2 max-w-[48ch] text-base leading-6 text-ink">{content.tagline}</p>
      </div>
    );
  }
  return (
    <figure className="relative overflow-hidden rounded-t-[calc(var(--radius-card)-2px)] bg-ink">
      <img
        src={cover.imageUrl}
        alt={cover.description}
        width={cover.width}
        height={cover.height}
        className="aspect-[16/10] w-full object-cover sm:aspect-[2/1]"
      />
      <figcaption className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-gradient-to-t from-[rgb(30_42_56/0.88)] via-[rgb(30_42_56/0.55)] to-transparent px-5 pt-16 pb-4 text-white">
        <span className="text-sm text-white/85">{destination.country}</span>
        <h3 className="font-display text-4xl leading-none font-semibold sm:text-5xl">{destination.city}</h3>
        <p className="mt-1.5 max-w-[48ch] text-[15px] leading-6 text-white/95">{content.tagline}</p>
      </figcaption>
    </figure>
  );
}

function Ticket({ block }: { block: TripPlanBlock }) {
  const { origin, destination, distanceKm, departureDate, returnDate, travelers } = block;
  const cheapest = block.flights?.cheapest;
  const dates = departureDate
    ? `${shortDate.format(toDate(departureDate))}${returnDate ? ` a ${shortDate.format(toDate(returnDate))}` : ""}`
    : "Datas em aberto";

  return (
    <div className="relative mx-4 -mt-px flex flex-col overflow-hidden rounded-b-[var(--radius-control)] border-[1.5px] border-t-0 border-ink/15 bg-card sm:flex-row">
      <div className="flex flex-1 items-center gap-3 px-4 py-3.5">
        <div className="flex min-w-0 flex-col">
          <span className="text-xs text-muted-foreground">De</span>
          <span className="truncate font-display text-lg leading-6 font-semibold text-ink">{origin?.city ?? "Sua cidade"}</span>
        </div>
        <div className="relative flex min-w-12 flex-1 flex-col items-center">
          <span
            aria-hidden="true"
            className="h-2 w-full"
            style={{
              backgroundImage: "radial-gradient(circle, var(--route) 0 2px, var(--ink) 2.5px 3.5px, transparent 4px)",
              backgroundSize: "11px 100%",
              backgroundRepeat: "repeat-x",
            }}
          />
          <Plane className="absolute -top-2 size-5 rotate-45 fill-route text-ink" strokeWidth={1.75} aria-hidden="true" />
          {distanceKm ? (
            <span className="mt-1.5 text-[11px] tabular-nums text-muted-foreground">{kilometers.format(distanceKm)} km</span>
          ) : null}
        </div>
        <div className="flex min-w-0 flex-col items-end">
          <span className="text-xs text-muted-foreground">Para</span>
          <span className="truncate font-display text-lg leading-6 font-semibold text-ink">{destination.city}</span>
        </div>
      </div>
      <div className="flex flex-col gap-0.5 border-t-[1.5px] border-dashed border-border px-4 py-3 sm:w-56 sm:justify-center sm:border-t-0 sm:border-l-[1.5px]">
        <span className="text-sm font-medium text-ink">{dates}</span>
        <span className="text-xs text-muted-foreground">
          {travelers} {travelers === 1 ? "viajante" : "viajantes"}
          {cheapest ? `, voos a partir de ${cheapest}` : ""}
        </span>
      </div>
    </div>
  );
}

function Facts({ block }: { block: TripPlanBlock }) {
  const facts = [
    block.forecast ? { label: "Agora", value: `${Math.round(block.forecast.currentCelsius)} °C` } : undefined,
    block.timeDifference ? { label: "Fuso", value: block.timeDifference } : undefined,
    block.content.facts.currency ? { label: "Moeda", value: block.content.facts.currency } : undefined,
    block.content.facts.language ? { label: "Idioma", value: block.content.facts.language } : undefined,
    block.content.facts.power ? { label: "Tomada", value: block.content.facts.power } : undefined,
  ].filter((fact) => fact !== undefined);

  if (facts.length === 0) return null;
  return (
    <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {facts.map((fact) => (
        <div key={fact.label} className="flex flex-col gap-0.5 rounded-[var(--radius-control)] bg-muted px-3 py-2.5">
          <dt className="text-xs text-muted-foreground">{fact.label}</dt>
          <dd className="text-sm leading-5 font-medium text-ink">{fact.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Forecast({ block }: { block: TripPlanBlock }) {
  if (block.outlook) {
    return (
      <div className="flex flex-col gap-4">
        <h4 className="font-display text-base font-semibold text-ink">Tempo durante a viagem</h4>
        <OutlookContent outlook={block.outlook} />
      </div>
    );
  }
  if (!block.forecast || block.forecast.days.length === 0) return null;
  const lastDay = block.forecast.days[block.forecast.days.length - 1]?.date;
  const tripIsLater = block.departureDate !== undefined && lastDay !== undefined && block.departureDate > lastDay;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-0.5">
        <h4 className="font-display text-base font-semibold text-ink">Previsão para os próximos dias</h4>
        {tripIsLater ? (
          <p className="text-xs text-muted-foreground">
            É o tempo desta semana em {block.destination.city}, não a previsão para as datas da viagem.
          </p>
        ) : null}
      </div>
      <ul className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {block.forecast.days.map((day) => (
          <ForecastDayCard key={day.date} day={day} />
        ))}
      </ul>
    </div>
  );
}

function Sources({ block }: { block: TripPlanBlock }) {
  if (block.sources.length === 0) return null;
  return (
    <details className="group text-sm">
      <summary className="w-fit cursor-pointer rounded-md text-xs font-medium text-lagoon-deep outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring">
        Fontes da pesquisa ({block.sources.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1">
        {block.sources.map((source) => (
          <li key={source.url}>
            <a
              href={source.url}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex max-w-full items-center gap-1 text-xs text-muted-foreground hover:text-ink hover:underline"
            >
              <span className="shrink-0 font-medium">{source.site}</span>
              <span className="truncate">{source.title}</span>
              <ArrowUpRight className="size-3 shrink-0" aria-hidden="true" />
            </a>
          </li>
        ))}
      </ul>
    </details>
  );
}

type Tab = Readonly<{ value: string; label: string; panel: ReactNode }>;

function planTabs(block: TripPlanBlock): ReadonlyArray<Tab> {
  const { content } = block;
  const tabs: Array<Tab | undefined> = [
    { value: "itinerary", label: "Roteiro", panel: <ItinerarySection itinerary={content.itinerary} photos={block.itemPhotos} /> },
    { value: "see", label: "O que ver", panel: <AttractionsSection attractions={content.attractions} photos={block.itemPhotos} /> },
    { value: "eat", label: "Comer", panel: <FoodSection food={content.food} photos={block.itemPhotos} /> },
    { value: "stay", label: "Onde ficar", panel: <StaySection neighborhoods={content.neighborhoods} photos={block.itemPhotos} /> },
    { value: "tips", label: "Mala e dicas", panel: <TipsSection content={content} /> },
    { value: "costs", label: "Custos", panel: <CostsSection block={block} /> },
    block.photos.length > 1
      ? { value: "photos", label: "Fotos", panel: <GalleryView block={{ type: "gallery", photos: block.photos }} /> }
      : undefined,
  ];
  return tabs.filter((tab) => tab !== undefined);
}

export function TripPlanView({ block }: { block: TripPlanBlock }) {
  const tabs = planTabs(block);
  return (
    <article
      className="flex w-full flex-col overflow-hidden rounded-[var(--radius-card)] border-[1.5px] border-border bg-card"
      aria-label={`Plano de viagem para ${block.destination.city}`}
    >
      <Hero block={block} />
      <Ticket block={block} />

      <div className="flex flex-col gap-5 px-4 pt-5 pb-4 sm:px-5">
        <div className="flex flex-col gap-3">
          <p className="max-w-[66ch] text-[15px] leading-7 text-ink">{block.content.summary}</p>
          {block.content.bestFor.length > 0 ? (
            <ul className="flex flex-wrap gap-1.5" aria-label="Ótimo para">
              {block.content.bestFor.map((profile) => (
                <li key={profile} className="rounded-full bg-island-soft px-2.5 py-1 text-xs text-[#2f6b2a]">
                  {profile}
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <Facts block={block} />
        <Forecast block={block} />

        <Tabs className="flex flex-col gap-4" defaultValue="itinerary">
          <TabsList
            className="-mx-1 flex gap-1 overflow-x-auto border-b-[1.5px] border-border px-1 scrollbar-hide"
            aria-label="Seções do plano"
          >
            {tabs.map((tab) => (
              <TabsTab
                key={tab.value}
                value={tab.value}
                className="-mb-[1.5px] shrink-0 border-b-[3px] border-transparent px-2.5 pt-1 pb-2 font-display text-[15px] font-medium text-muted-foreground outline-none transition-colors hover:text-ink focus-visible:ring-2 focus-visible:ring-ring data-[selected]:border-pin data-[selected]:text-ink"
              >
                {tab.label}
              </TabsTab>
            ))}
          </TabsList>
          {tabs.map((tab) => (
            <TabsPanel key={tab.value} value={tab.value}>
              {tab.panel}
            </TabsPanel>
          ))}
        </Tabs>

        <Sources block={block} />
      </div>
    </article>
  );
}
