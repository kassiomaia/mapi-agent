import type { ReactNode } from "react";
import { cn } from "@/components/beui/lib/utils";
import type { CityPhoto } from "../../../agents/services/types.js";

type ColumnSpan = 2 | 3 | 4 | 6;
type RowSpan = 1 | 2;

export type BentoSpan = Readonly<{ columns: ColumnSpan; rows: RowSpan }>;
export type BentoTone = "lagoon" | "pin" | "island";

const columnClass: Readonly<Record<ColumnSpan, string>> = {
  2: "sm:col-span-2",
  3: "sm:col-span-3",
  4: "sm:col-span-4",
  6: "sm:col-span-6",
};

const rowClass: Readonly<Record<RowSpan, string>> = {
  1: "sm:row-span-1",
  2: "sm:row-span-2",
};

const toneClass: Readonly<Record<BentoTone, string>> = {
  lagoon: "bg-lagoon-soft text-ink",
  pin: "bg-[#fde3e1] text-ink",
  island: "bg-island-soft text-ink",
};

const toneIconClass: Readonly<Record<BentoTone, string>> = {
  lagoon: "text-lagoon-deep",
  pin: "text-pin-deep",
  island: "text-[#2f7a2a]",
};

function remainingSpans(count: number): ReadonlyArray<BentoSpan> {
  if (count <= 0) return [];
  if (count === 1) return [{ columns: 6, rows: 1 }];
  if (count === 2) return [{ columns: 3, rows: 1 }, { columns: 3, rows: 1 }];
  if (count === 4) return Array.from({ length: 4 }, () => ({ columns: 3, rows: 1 }) as const);
  return [...Array.from({ length: 3 }, () => ({ columns: 2, rows: 1 }) as const), ...remainingSpans(count - 3)];
}

export function bentoSpans(count: number): ReadonlyArray<BentoSpan> {
  if (count <= 0) return [];
  if (count === 1) return [{ columns: 6, rows: 2 }];
  if (count === 2) return [{ columns: 4, rows: 2 }, { columns: 2, rows: 2 }];
  return [{ columns: 4, rows: 2 }, { columns: 2, rows: 1 }, { columns: 2, rows: 1 }, ...remainingSpans(count - 3)];
}

type BentoGridProps = Readonly<{ label: string; children: ReactNode }>;

export function BentoGrid({ label, children }: BentoGridProps) {
  return (
    <ul
      aria-label={label}
      className="grid grid-cols-1 gap-3 sm:grid-flow-dense sm:auto-rows-[12.5rem] sm:grid-cols-6"
    >
      {children}
    </ul>
  );
}

type BentoTileProps = Readonly<{
  name: string;
  photo: CityPhoto | undefined;
  span: BentoSpan;
  featured: boolean;
  mirrored?: boolean;
  tone: BentoTone;
  icon: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}>;

export function BentoTile({ name, photo, span, featured, mirrored = false, tone, icon, badge, children }: BentoTileProps) {
  const hasPhoto = photo !== undefined;
  return (
    <li
      className={cn(
        "relative flex overflow-hidden rounded-[var(--radius-card)] border-[1.5px] border-border",
        featured ? "min-h-72" : "min-h-56",
        "sm:min-h-0",
        columnClass[span.columns],
        rowClass[span.rows],
        featured && mirrored && "sm:col-start-3",
        hasPhoto ? "bg-ink text-white" : toneClass[tone],
      )}
    >
      {photo ? (
        <>
          <img
            src={photo.imageUrl}
            alt={name}
            width={photo.width}
            height={photo.height}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 size-full object-cover"
          />
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-[rgb(30_42_56/0.92)] via-[rgb(30_42_56/0.5)] via-45% to-transparent to-75%"
          />
          <a
            href={photo.pageUrl}
            target="_blank"
            rel="noreferrer noopener"
            title={`Foto de ${photo.author} (${photo.license}), no Wikimedia Commons`}
            className="absolute top-2 right-2 max-w-[calc(100%-1rem)] truncate rounded-full bg-[rgb(30_42_56/0.6)] px-2 py-0.5 text-[10px] leading-4 text-white/90 backdrop-blur-sm outline-none hover:bg-[rgb(30_42_56/0.85)] focus-visible:ring-2 focus-visible:ring-white"
          >
            {photo.author}, {photo.license}
          </a>
        </>
      ) : (
        <span aria-hidden="true" className={cn("absolute top-3 right-3 opacity-70 [&_svg]:size-9", toneIconClass[tone])}>
          {icon}
        </span>
      )}

      <div className={cn("relative mt-auto flex w-full flex-col gap-1", featured ? "p-4 sm:p-5" : "p-3.5")}>
        {badge}
        <h4
          className={cn(
            "font-display font-semibold text-balance",
            featured ? "text-2xl leading-8" : "text-base leading-6",
            hasPhoto && "[text-shadow:0_1px_2px_rgb(0_0_0/0.35)]",
          )}
        >
          {name}
        </h4>
        <div className={cn("flex flex-col gap-1.5 text-sm leading-5", hasPhoto ? "text-white/90" : "text-ink/85")}>
          {children}
        </div>
      </div>
    </li>
  );
}
