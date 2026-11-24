import { Check, ChevronDown, LoaderCircle, Minus, Plane, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/components/beui/lib/utils";
import type { ProgressStep, ProgressStepStatus, ToolProgress } from "../../agents/types.js";

const FINISHED: ReadonlySet<ProgressStepStatus> = new Set(["done", "skipped", "failed"]);

const ROUTE_DOTS = "radial-gradient(circle, var(--route) 0 3px, var(--ink) 3.5px 5px, transparent 5.5px)";
const PENDING_DOTS = "radial-gradient(circle, var(--input) 0 3px, transparent 3.5px)";

function StepIcon({ status }: { status: ProgressStepStatus }) {
  const base = "grid size-5 shrink-0 place-items-center rounded-full";
  switch (status) {
    case "pending":
      return <span className={cn(base, "border-[1.5px] border-input")} />;
    case "running":
      return (
        <span className={cn(base, "bg-route/40")}>
          <LoaderCircle className="size-3.5 animate-spin text-ink" />
        </span>
      );
    case "done":
      return (
        <span className={cn(base, "border-[1.5px] border-ink bg-island")}>
          <Check className="size-3 text-ink" strokeWidth={3} />
        </span>
      );
    case "skipped":
      return (
        <span className={cn(base, "bg-muted")}>
          <Minus className="size-3 text-muted-foreground" strokeWidth={3} />
        </span>
      );
    case "failed":
      return (
        <span className={cn(base, "bg-[#fde3e1]")}>
          <X className="size-3 text-pin-deep" strokeWidth={3} />
        </span>
      );
  }
}

function StepRow({ step }: { step: ProgressStep }) {
  return (
    <li className="flex items-start gap-2.5 py-1">
      <StepIcon status={step.status} />
      <span className="flex min-w-0 flex-col leading-5">
        <span
          className={cn(
            "text-sm",
            step.status === "pending" && "text-muted-foreground",
            step.status === "running" && "font-medium text-ink",
            step.status === "done" && "text-ink",
            (step.status === "skipped" || step.status === "failed") && "text-muted-foreground",
          )}
        >
          {step.label}
        </span>
        {step.detail && step.status !== "running" ? (
          <span className={cn("truncate text-xs", step.status === "failed" ? "text-pin-deep" : "text-muted-foreground")}>
            {step.status === "failed" ? "Não consegui concluir" : step.detail}
          </span>
        ) : null}
      </span>
    </li>
  );
}

function RouteProgress({ ratio }: { ratio: number }) {
  const percent = Math.round(ratio * 100);
  return (
    <div
      className="relative h-7"
      role="progressbar"
      aria-label="Progresso do plano"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
    >
      <div
        className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2"
        style={{ backgroundImage: PENDING_DOTS, backgroundSize: "14px 100%", backgroundRepeat: "repeat-x" }}
      />
      <div
        className="absolute top-1/2 left-0 h-3 -translate-y-1/2 transition-[width] duration-500 ease-out"
        style={{ width: `${percent}%`, backgroundImage: ROUTE_DOTS, backgroundSize: "14px 100%", backgroundRepeat: "repeat-x" }}
      />
      <Plane
        aria-hidden="true"
        className="absolute top-1/2 size-6 -translate-y-1/2 rotate-45 fill-route text-ink transition-[left] duration-500 ease-out"
        strokeWidth={1.75}
        style={{ left: `calc(${percent}% - ${percent === 0 ? 0 : 12}px)` }}
      />
    </div>
  );
}

type PlannerProgressProps = Readonly<{
  progress: ToolProgress;
  active: boolean;
}>;

export function PlannerProgress({ progress, active }: PlannerProgressProps) {
  const finished = progress.steps.filter((step) => FINISHED.has(step.status)).length;
  const total = progress.steps.length;
  const complete = finished === total;
  const interrupted = !complete && !active;
  const [expanded, setExpanded] = useState(false);
  const open = (!complete && !interrupted) || expanded;
  const ratio = total === 0 ? 0 : finished / total;

  const title = complete
    ? `${progress.title}: pronto`
    : interrupted
      ? `${progress.title}: interrompido`
      : `Montando o ${progress.title.charAt(0).toLowerCase()}${progress.title.slice(1)}`;

  return (
    <section className="flex w-full flex-col gap-3 rounded-[var(--radius-card)] border-[1.5px] border-border bg-card px-4 pt-3.5 pb-3">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="font-display text-base leading-6 font-semibold text-ink">{title}</h3>
        <span className="shrink-0 text-xs tabular-nums text-muted-foreground" aria-live="polite">
          {finished} de {total} etapas
        </span>
      </div>

      <RouteProgress ratio={ratio} />

      {open ? (
        <ol className="grid gap-x-6 sm:grid-cols-2">
          {progress.steps.map((step) => (
            <StepRow key={step.id} step={step} />
          ))}
        </ol>
      ) : null}

      {complete || interrupted ? (
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setExpanded((value) => !value)}
          className="flex w-fit items-center gap-1 rounded-md text-xs font-medium text-lagoon-deep outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring"
        >
          {open ? "Ocultar etapas" : "Ver etapas"}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} aria-hidden="true" />
        </button>
      ) : null}
    </section>
  );
}
