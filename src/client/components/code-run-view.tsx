import { ChevronRight, CircleAlert, SquareFunction } from "lucide-react";
import type { CodeRunBlock, CodeRunCell, CodeRunDisplay } from "../../agents/generative-ui/types.js";

const numberFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

function formatCell(value: CodeRunCell): string {
  if (value === null) return "—";
  if (typeof value === "number") return numberFormat.format(value);
  if (typeof value === "boolean") return value ? "sim" : "não";
  return value;
}

function humanLabel(key: string): string {
  const spaced = key.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").trim();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1).toLowerCase();
}

function DisplayView({ display }: { display: CodeRunDisplay }) {
  switch (display.kind) {
    case "stats":
      return (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(9rem,1fr))] gap-x-6 gap-y-3">
          {display.items.map((item) => (
            <div key={item.label} className="flex flex-col gap-0.5">
              <dt className="text-xs leading-4 text-muted-foreground">{humanLabel(item.label)}</dt>
              <dd className="font-display text-xl leading-7 font-semibold tabular-nums text-ink">{formatCell(item.value)}</dd>
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/60 text-xs text-muted-foreground">
              <tr>
                {display.columns.map((column) => (
                  <th key={column} scope="col" className="px-3 py-2 font-medium whitespace-nowrap">
                    {humanLabel(column)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {display.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className={typeof cell === "number" ? "px-3 py-2 tabular-nums" : "px-3 py-2"}>
                      {formatCell(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "list":
      return (
        <ol className="flex flex-col gap-1.5 text-sm leading-6">
          {display.items.map((item, index) => (
            <li key={index} className="flex gap-2.5">
              <span className="grid size-6 shrink-0 place-items-center rounded-full bg-lagoon-soft text-xs font-semibold text-lagoon-deep tabular-nums">
                {index + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>
      );
    case "json":
      return (
        <pre className="max-h-72 overflow-auto rounded-[var(--radius-control)] bg-muted/60 p-3 text-xs leading-5 text-foreground">
          {display.text}
        </pre>
      );
  }
}

export function CodeRunView({ block }: { block: CodeRunBlock }) {
  const failed = block.status === "error";
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-2.5">
        <span
          className={
            failed
              ? "grid size-8 shrink-0 place-items-center rounded-full bg-destructive/10 text-destructive"
              : "grid size-8 shrink-0 place-items-center rounded-full bg-lagoon-soft text-lagoon-deep"
          }
        >
          {failed ? <CircleAlert className="size-4" aria-hidden="true" /> : <SquareFunction className="size-4" aria-hidden="true" />}
        </span>
        <div className="flex min-w-0 flex-col gap-0.5">
          <h4 className="font-display text-base leading-6 font-semibold text-ink">{block.goal}</h4>
          <p className="text-xs leading-5 text-muted-foreground">
            {failed ? "O código falhou na sandbox" : "Calculado na sandbox"} em {numberFormat.format(block.durationMs)} ms
          </p>
        </div>
      </div>

      {failed ? (
        <p className="rounded-[var(--radius-control)] bg-destructive/10 px-3 py-2 text-sm leading-6 text-destructive">{block.error}</p>
      ) : block.display ? (
        <DisplayView display={block.display} />
      ) : null}

      <details className="group rounded-[var(--radius-control)] border border-border">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground outline-none select-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden">
          <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" aria-hidden="true" />
          Ver o código{block.logs.length > 0 ? " e os logs" : ""}
        </summary>
        <div className="flex flex-col gap-2 border-t border-border p-3">
          <pre className="max-h-80 overflow-auto text-xs leading-5 text-foreground">
            <code>{block.code}</code>
          </pre>
          {block.logs.length > 0 ? (
            <pre className="max-h-40 overflow-auto rounded-[var(--radius-control)] bg-muted/60 p-2 text-xs leading-5 text-muted-foreground">
              {block.logs.join("\n")}
            </pre>
          ) : null}
        </div>
      </details>
    </div>
  );
}
