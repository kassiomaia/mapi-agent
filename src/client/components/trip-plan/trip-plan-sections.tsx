import { ArrowUpRight, BedDouble, CalendarHeart, Lightbulb, MapPinned, Moon, Sun, Sunrise, UtensilsCrossed } from "lucide-react";
import { useState, type ReactNode } from "react";
import { cn } from "@/components/beui/lib/utils";
import type { TripPlanBlock } from "../../../agents/generative-ui/types.js";
import type { CityPhoto } from "../../../agents/services/types.js";
import { BentoGrid, BentoTile, bentoSpans } from "./bento.js";

type Content = TripPlanBlock["content"];

function EmptyNote({ children }: { children: ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

const periods = [
  { key: "morning", label: "Manhã", icon: <Sunrise className="size-4" aria-hidden="true" /> },
  { key: "afternoon", label: "Tarde", icon: <Sun className="size-4" aria-hidden="true" /> },
  { key: "evening", label: "Noite", icon: <Moon className="size-4" aria-hidden="true" /> },
] as const;

function DayPhoto({ name, photo }: { name: string; photo: CityPhoto | undefined }) {
  if (!photo) return null;
  return (
    <figure className="flex w-24 shrink-0 flex-col gap-1 sm:w-36">
      <img
        src={photo.imageUrl}
        alt={name}
        width={photo.width}
        height={photo.height}
        loading="lazy"
        decoding="async"
        className="aspect-[4/3] w-full rounded-[var(--radius-control)] bg-muted object-cover"
      />
      <figcaption className="min-w-0">
        <a
          href={photo.pageUrl}
          target="_blank"
          rel="noreferrer noopener"
          title={`Foto de ${photo.author} (${photo.license}), no Wikimedia Commons`}
          className="block truncate rounded-sm text-[10px] leading-4 text-muted-foreground outline-none hover:text-ink hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {photo.author}, {photo.license}
        </a>
      </figcaption>
    </figure>
  );
}

export function ItinerarySection({ itinerary, photos }: { itinerary: Content["itinerary"]; photos: TripPlanBlock["itemPhotos"] }) {
  return (
    <ol className="flex flex-col">
      {itinerary.map((day, index) => (
        <li key={day.day} className="relative flex gap-4 pb-6 last:pb-0">
          {index < itinerary.length - 1 ? (
            <span
              aria-hidden="true"
              className="absolute top-10 bottom-0 left-[1.1875rem] w-1"
              style={{
                backgroundImage: "radial-gradient(circle, var(--route) 0 2px, var(--ink) 2.5px 3.5px, transparent 4px)",
                backgroundSize: "100% 12px",
                backgroundRepeat: "repeat-y",
              }}
            />
          ) : null}
          <span className="grid size-10 shrink-0 place-items-center rounded-full border-2 border-ink bg-route font-display text-base font-semibold text-ink">
            {day.day}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1.5">
            <h4 className="font-display text-base leading-6 font-semibold text-ink">
              Dia {day.day}: {day.title}
            </h4>
            <div className="flex items-start gap-3 sm:gap-4">
              <DayPhoto name={day.title} photo={photos[day.wikipediaTitle]} />
              <dl className="flex min-w-0 flex-1 flex-col gap-1.5">
                {periods.map((period) => (
                  <div key={period.key} className="grid text-sm leading-6 sm:grid-cols-[5.5rem_1fr] sm:gap-2">
                    <dt className="flex items-center gap-1.5 text-muted-foreground">
                      {period.icon}
                      {period.label}
                    </dt>
                    <dd className="text-ink">{day[period.key]}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}

type Photos = TripPlanBlock["itemPhotos"];

export function AttractionsSection({ attractions, photos }: { attractions: Content["attractions"]; photos: Photos }) {
  if (attractions.length === 0) return <EmptyNote>A pesquisa não trouxe atrações.</EmptyNote>;
  const spans = bentoSpans(attractions.length);
  return (
    <BentoGrid label="Atrações">
      {attractions.map((attraction, index) => {
        const featured = index === 0;
        return (
          <BentoTile
            key={attraction.name}
            name={attraction.name}
            photo={photos[attraction.wikipediaTitle]}
            span={spans[index] ?? { columns: 2, rows: 1 }}
            featured={featured}
            tone="lagoon"
            icon={<MapPinned />}
            badge={
              featured ? (
                <span className="w-fit rounded-full bg-pin px-2 py-0.5 text-xs font-semibold text-white">Imperdível</span>
              ) : undefined
            }
          >
            <p className={featured ? "line-clamp-3 sm:line-clamp-4" : "line-clamp-2"}>{attraction.description}</p>
            {attraction.tip && featured ? (
              <p className="flex items-start gap-1.5 text-xs leading-4">
                <Lightbulb className="mt-px size-3.5 shrink-0 text-route" aria-hidden="true" />
                <span>{attraction.tip}</span>
              </p>
            ) : null}
            {attraction.tip && !featured ? <p className="sr-only">Dica: {attraction.tip}</p> : null}
          </BentoTile>
        );
      })}
    </BentoGrid>
  );
}

export function FoodSection({ food, photos }: { food: Content["food"]; photos: Photos }) {
  if (food.length === 0) return <EmptyNote>A pesquisa não trouxe pratos típicos.</EmptyNote>;
  const spans = bentoSpans(food.length);
  return (
    <BentoGrid label="Pratos típicos">
      {food.map((item, index) => (
        <BentoTile
          key={item.name}
          name={item.name}
          photo={photos[item.wikipediaTitle]}
          span={spans[index] ?? { columns: 2, rows: 1 }}
          featured={index === 0}
          mirrored
          tone="pin"
          icon={<UtensilsCrossed />}
        >
          <p className={index === 0 ? "line-clamp-4" : "line-clamp-2"} title={item.description}>
            {item.description}
          </p>
        </BentoTile>
      ))}
    </BentoGrid>
  );
}

export function StaySection({ neighborhoods, photos }: { neighborhoods: Content["neighborhoods"]; photos: Photos }) {
  if (neighborhoods.length === 0) return <EmptyNote>A pesquisa não trouxe sugestões de bairros.</EmptyNote>;
  const spans = bentoSpans(neighborhoods.length);
  return (
    <BentoGrid label="Bairros para se hospedar">
      {neighborhoods.map((place, index) => (
        <BentoTile
          key={place.name}
          name={place.name}
          photo={photos[place.wikipediaTitle]}
          span={spans[index] ?? { columns: 2, rows: 1 }}
          featured={index === 0}
          tone="island"
          icon={<BedDouble />}
          badge={
            <span className="w-fit max-w-full truncate rounded-full bg-island px-2 py-0.5 text-xs font-medium text-ink" title={place.goodFor}>
              {place.goodFor}
            </span>
          }
        >
          <p className={index === 0 ? "line-clamp-4" : "line-clamp-2"} title={place.description}>
            {place.description}
          </p>
        </BentoTile>
      ))}
    </BentoGrid>
  );
}

function PackingList({ items }: { items: ReadonlyArray<string> }) {
  const [packed, setPacked] = useState<ReadonlySet<number>>(new Set());
  const toggle = (index: number): void =>
    setPacked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-3">
        <h4 className="font-display text-base font-semibold text-ink">Na mala</h4>
        <span className="text-xs tabular-nums text-muted-foreground">
          {packed.size} de {items.length} separados
        </span>
      </div>
      <ul className="grid gap-1.5 sm:grid-cols-2">
        {items.map((item, index) => (
          <li key={item}>
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md px-1 py-1 text-sm leading-5 hover:bg-muted/60">
              <input
                type="checkbox"
                checked={packed.has(index)}
                onChange={() => toggle(index)}
                className="mt-0.5 size-4 shrink-0 accent-[var(--ink)]"
              />
              <span className={cn("text-ink", packed.has(index) && "text-muted-foreground line-through")}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function TipsSection({ content }: { content: Content }) {
  return (
    <div className="flex flex-col gap-6">
      {content.tips.length > 0 ? (
        <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {content.tips.map((tip) => (
            <div key={tip.topic} className="flex flex-col gap-0.5">
              <dt className="text-sm font-semibold text-ink">{tip.topic}</dt>
              <dd className="text-sm leading-6 text-ink">{tip.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {content.events.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="font-display text-base font-semibold text-ink">Acontece no período</h4>
          <ul className="flex flex-col gap-2">
            {content.events.map((event) => (
              <li key={event.name} className="flex gap-3 rounded-[var(--radius-control)] bg-[#fff3c4]/70 p-3">
                <CalendarHeart className="mt-0.5 size-4 shrink-0 text-[#8a6500]" aria-hidden="true" />
                <span className="flex flex-col gap-0.5 text-sm leading-6">
                  <span className="font-semibold text-ink">
                    {event.name} <span className="font-normal text-muted-foreground">({event.when})</span>
                  </span>
                  <span className="text-ink">{event.description}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {content.packing.length > 0 ? <PackingList items={content.packing} /> : null}
    </div>
  );
}

export function CostsSection({ block }: { block: TripPlanBlock }) {
  const { budget } = block.content;
  const offers = block.flights?.offers ?? [];
  return (
    <div className="flex flex-col gap-6">
      {budget ? (
        <div className="flex flex-col gap-2">
          <h4 className="font-display text-base font-semibold text-ink">Gasto por dia, por pessoa</h4>
          <dl className="grid grid-cols-3 gap-2">
            {[
              { label: "Econômico", value: budget.economic },
              { label: "Conforto", value: budget.comfortable },
              { label: "Luxo", value: budget.luxury },
            ].map((tier) => (
              <div key={tier.label} className="flex flex-col gap-0.5 rounded-[var(--radius-control)] bg-muted px-3 py-2.5">
                <dt className="text-xs text-muted-foreground">{tier.label}</dt>
                <dd className="text-sm font-semibold tabular-nums text-ink">{tier.value}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs leading-5 text-muted-foreground">{budget.note}</p>
        </div>
      ) : (
        <EmptyNote>A pesquisa não trouxe uma estimativa de gasto diário.</EmptyNote>
      )}

      {offers.length > 0 ? (
        <div className="flex flex-col gap-2">
          <h4 className="font-display text-base font-semibold text-ink">Passagens encontradas na web</h4>
          <ul className="flex flex-col divide-y divide-border rounded-[var(--radius-control)] border-[1.5px] border-border">
            {offers.map((offer) => (
              <li key={offer.url}>
                <a
                  href={offer.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="group flex items-center justify-between gap-3 px-3.5 py-2.5 text-sm outline-none hover:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="flex min-w-0 items-center gap-1.5 text-ink">
                    <span className="truncate">{offer.site}</span>
                    <ArrowUpRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </span>
                  <span className="shrink-0 font-semibold tabular-nums text-ink">{offer.price ?? "ver preço"}</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="text-xs leading-5 text-muted-foreground">
            Preços de referência da rota em comparadores, não cotações para as suas datas.
          </p>
        </div>
      ) : null}
    </div>
  );
}
