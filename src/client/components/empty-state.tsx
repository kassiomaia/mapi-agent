import { CloudSun, NotebookPen, Plane, Route } from "lucide-react";
import type { ReactNode } from "react";
import { Mascot } from "./mascot.js";

type TripIdea = Readonly<{ prompt: string; icon: ReactNode; tint: string }>;

const tripIdeas: ReadonlyArray<TripIdea> = [
  {
    prompt: "Quero passar o Ano Novo em Lisboa. Quanto custa a passagem saindo de São Paulo?",
    icon: <Plane className="size-4" />,
    tint: "bg-[#fde3e1] text-pin-deep",
  },
  {
    prompt: "Estou entre Roma e Paris. Onde está mais quente agora?",
    icon: <CloudSun className="size-4" />,
    tint: "bg-lagoon-soft text-lagoon-deep",
  },
  {
    prompt: "Monte um plano completo para 5 dias em Buenos Aires saindo de Recife, em março. Gosto de comer bem.",
    icon: <NotebookPen className="size-4" />,
    tint: "bg-island-soft text-[#2f7a2a]",
  },
  {
    prompt: "Vou fazer Lisboa, Madri e Barcelona. Qual a distância de cada trecho?",
    icon: <Route className="size-4" />,
    tint: "bg-[#fff3c4] text-[#8a6500]",
  },
];

const ROUTE_PATH = "M10 70 C 90 92, 150 20, 250 44 S 400 86, 470 40 S 560 14, 596 26";

function RouteLine() {
  return (
    <svg viewBox="0 0 640 100" preserveAspectRatio="xMinYMid meet" className="h-20 min-w-0 flex-1 sm:h-24" aria-hidden="true">
      <g className="route-reveal" fill="none" strokeLinecap="round">
        <path d={ROUTE_PATH} stroke="var(--ink)" strokeWidth={13} strokeDasharray="0.1 21" />
        <path d={ROUTE_PATH} stroke="var(--route)" strokeWidth={8} strokeDasharray="0.1 21" />
      </g>
      <g className="route-plane" transform="translate(612 22) rotate(-18) scale(1.25)">
        <path
          d="M-14 -3 L4 -3 L12 -12 L16 -12 L12 -3 L20 -3 Q24 0 20 3 L12 3 L16 12 L12 12 L4 3 L-14 3 L-18 8 L-21 8 L-19 0 L-21 -8 L-18 -8 Z"
          fill="var(--route)"
          stroke="var(--ink)"
          strokeWidth={2.5}
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

type EmptyStateProps = Readonly<{
  disabled: boolean;
  onPick: (prompt: string) => void;
}>;

export function EmptyState({ disabled, onPick }: EmptyStateProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col justify-center gap-7 px-4 py-10">
        <div className="flex flex-col gap-5">
          <div className="flex items-end gap-1">
            <Mascot decorative className="size-24 -ml-1 sm:size-32" />
            <RouteLine />
          </div>
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-[2.5rem] leading-[1.05] font-semibold text-balance text-ink sm:text-5xl">
              Para onde vamos?
            </h2>
            <p className="max-w-[54ch] text-base leading-7 text-muted-foreground">
              Me diga um destino e mais ou menos quando. Eu pesquiso o preço das passagens, o clima agora no lugar,
              fotos da cidade e a distância entre as paradas, para você decidir com números de verdade.
            </p>
          </div>
        </div>

        <ul className="grid gap-2.5 sm:grid-cols-2">
          {tripIdeas.map((idea) => (
            <li key={idea.prompt}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => onPick(idea.prompt)}
                className="flex h-full w-full items-start gap-3 rounded-[var(--radius-card)] border-[1.5px] border-border bg-card px-3.5 py-3 text-left text-sm leading-5 text-ink transition-colors hover:border-ink focus-visible:border-ink disabled:pointer-events-none disabled:opacity-50"
              >
                <span className={`grid size-8 shrink-0 place-items-center rounded-full ${idea.tint}`}>{idea.icon}</span>
                <span className="pt-1.5">{idea.prompt}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
