import { Check, X } from "lucide-react";
import type { NextStep } from "../../agents/types.js";
import type { NextStepChoice } from "../types.js";

type NextStepPromptProps = Readonly<{
  nextStep: NextStep;
  choice: NextStepChoice;
  current: boolean;
  disabled: boolean;
  onAnswer: (accepted: boolean) => void;
}>;

export function NextStepPrompt({ nextStep, choice, current, disabled, onAnswer }: NextStepPromptProps) {
  if (choice !== "pending") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {choice === "accepted" ? (
          <Check className="size-3.5 text-[#2f7a2a]" aria-hidden="true" />
        ) : (
          <X className="size-3.5" aria-hidden="true" />
        )}
        Você respondeu {choice === "accepted" ? "sim" : "não"}.
      </p>
    );
  }
  if (!current) return null;

  return (
    <div role="group" aria-label={nextStep.question} className="flex">
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(true)}
          title={nextStep.confirmPrompt}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink bg-pin px-4 text-sm font-semibold text-white shadow-[0_2px_0_var(--ink)] outline-none transition-[transform,box-shadow,background-color] hover:bg-pin-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-50"
        >
          <Check className="size-4" aria-hidden="true" />
          Sim
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onAnswer(false)}
          className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-ink/25 bg-card px-4 text-sm font-semibold text-ink outline-none transition-colors hover:border-ink focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        >
          Não
        </button>
      </div>
    </div>
  );
}
