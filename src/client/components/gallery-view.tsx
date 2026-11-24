import { ChevronLeft, ChevronRight, ExternalLink } from "lucide-react";
import { useState, type KeyboardEvent } from "react";
import type { GalleryBlock } from "../../agents/generative-ui/types.js";

const navButtonClass =
  "absolute top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-background/85 text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.12)] backdrop-blur outline-none transition-opacity hover:bg-background focus-visible:ring-2 focus-visible:ring-ring";

export function GalleryView({ block }: { block: GalleryBlock }) {
  const [selected, setSelected] = useState(0);
  const count = block.photos.length;
  const photo = block.photos[selected];
  if (!photo) return null;

  const show = (index: number): void => setSelected((index + count) % count);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      show(selected + 1);
    } else if (event.key === "ArrowLeft") {
      event.preventDefault();
      show(selected - 1);
    }
  };

  return (
    <figure className="flex flex-col gap-2.5" aria-roledescription="galeria" onKeyDown={onKeyDown}>
      <div className="relative overflow-hidden rounded-[var(--radius-control)] bg-muted">
        <img
          key={photo.imageUrl}
          src={photo.imageUrl}
          alt={photo.description}
          width={photo.width}
          height={photo.height}
          decoding="async"
          className="aspect-[3/2] w-full object-contain animate-in fade-in duration-200"
        />
        {count > 1 ? (
          <>
            <button type="button" aria-label="Foto anterior" onClick={() => show(selected - 1)} className={`${navButtonClass} left-2`}>
              <ChevronLeft className="size-4" aria-hidden="true" />
            </button>
            <button type="button" aria-label="Próxima foto" onClick={() => show(selected + 1)} className={`${navButtonClass} right-2`}>
              <ChevronRight className="size-4" aria-hidden="true" />
            </button>
            <span className="absolute bottom-2 right-2 rounded-full bg-background/85 px-2 py-0.5 text-xs tabular-nums text-foreground backdrop-blur">
              {selected + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      <figcaption className="flex flex-col gap-0.5 text-sm">
        <span className="leading-5 text-foreground">{photo.description}</span>
        <span className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
          <span>
            {photo.author}, {photo.license}
          </span>
          <a
            href={photo.pageUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-1 underline decoration-border underline-offset-2 outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            Wikimedia Commons
            <ExternalLink className="size-3" aria-hidden="true" />
          </a>
        </span>
      </figcaption>

      {count > 1 ? (
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide" role="group" aria-label="Fotos">
          {block.photos.map((thumbnail, index) => (
            <button
              key={thumbnail.file}
              type="button"
              aria-label={`Mostrar foto ${index + 1}: ${thumbnail.description}`}
              aria-pressed={index === selected}
              onClick={() => show(index)}
              className="relative h-14 w-20 shrink-0 overflow-hidden rounded-md bg-muted opacity-60 outline-none transition-opacity hover:opacity-100 focus-visible:ring-2 focus-visible:ring-ring aria-pressed:opacity-100 aria-pressed:ring-2 aria-pressed:ring-foreground"
            >
              <img src={thumbnail.imageUrl} alt="" loading="lazy" decoding="async" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}
    </figure>
  );
}
