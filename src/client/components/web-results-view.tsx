import { ArrowUpRight, Info } from "lucide-react";
import type { WebResultsBlock } from "../../agents/generative-ui/types.js";

export function WebResultsView({ block }: { block: WebResultsBlock }) {
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-col divide-y divide-border overflow-hidden rounded-[var(--radius-control)] border border-border">
        {block.results.map((result) => (
          <li key={result.url}>
            <a
              href={result.url}
              target="_blank"
              rel="noreferrer noopener"
              className="group flex gap-4 px-3.5 py-3 outline-none transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  {result.site}
                  <ArrowUpRight
                    className="size-3 opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
                    aria-hidden="true"
                  />
                </span>
                <span className="text-sm font-medium leading-5 text-foreground group-hover:underline group-hover:underline-offset-2">
                  {result.title}
                </span>
                <span className="line-clamp-2 text-xs leading-5 text-muted-foreground">{result.snippet}</span>
              </div>
              {result.price ? (
                <span className="flex shrink-0 flex-col items-end gap-0.5 pt-4 text-right">
                  <span className="text-[11px] text-muted-foreground">a partir de</span>
                  <span className="text-sm font-semibold tabular-nums text-foreground">{result.price}</span>
                </span>
              ) : null}
            </a>
          </li>
        ))}
      </ol>
      <p className="flex items-start gap-1.5 text-xs leading-5 text-muted-foreground">
        <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
        <span>
          {block.note} Busca: “{block.query}”.
        </span>
      </p>
    </div>
  );
}
