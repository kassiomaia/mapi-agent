import { Calculator, CloudSun, Images, MapPin, NotebookPen, Plane, Route } from "lucide-react";
import { useRef, useState } from "react";
import { PromptInput, type PromptAction } from "@/components/beui/components/agents/prompt-input";

const templates: Readonly<Record<string, string>> = {
  plan: "Monte um plano completo de viagem de São Paulo para ",
  flights: "Quanto custa uma passagem de São Paulo para ",
  weather: "Como está o tempo agora em ",
  photos: "Mostre fotos de ",
  distance: "Qual a distância entre Lisboa e ",
  coordinates: "Onde fica ",
  budget: "Quanto fica R$ 4.800 dividido por ",
};

const actions: PromptAction[] = [
  {
    value: "plan",
    label: "Plano completo",
    description: "Roteiro, fotos, clima, custos e dicas",
    icon: <NotebookPen />,
  },
  {
    value: "flights",
    label: "Preço de passagens",
    description: "Quanto custa voar entre duas cidades",
    icon: <Plane />,
  },
  {
    value: "weather",
    label: "Clima agora",
    description: "Temperatura atual no destino",
    icon: <CloudSun />,
  },
  {
    value: "photos",
    label: "Fotos",
    description: "Veja como é o lugar",
    icon: <Images />,
  },
  {
    value: "distance",
    label: "Distância entre paradas",
    description: "Quilômetros entre cidades, no mapa",
    icon: <Route />,
  },
  {
    value: "coordinates",
    label: "Localizar cidade",
    description: "Onde fica, com as coordenadas",
    icon: <MapPin />,
  },
  {
    value: "budget",
    label: "Dividir o orçamento",
    description: "Contas rápidas de custos e divisões",
    icon: <Calculator />,
  },
];

const COUNTER_THRESHOLD = 0.8;

type ComposerProps = Readonly<{
  maxLength: number;
  busy: boolean;
  disabled: boolean;
  onSubmit: (text: string) => void;
  onCancel: () => void;
}>;

function focusAtEnd(container: HTMLElement | null): void {
  const textarea = container?.querySelector("textarea");
  if (!textarea) return;
  textarea.focus({ preventScroll: true });
  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
}

export function Composer({ maxLength, busy, disabled, onSubmit, onCancel }: ComposerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState("");
  const showCounter = value.length >= maxLength * COUNTER_THRESHOLD;

  const insertTemplate = (action: string): void => {
    setValue(templates[action] ?? "");
    requestAnimationFrame(() => focusAtEnd(containerRef.current));
  };

  return (
    <div ref={containerRef} className="flex flex-col gap-1.5">
      <PromptInput
        value={value}
        onValueChange={setValue}
        actions={actions}
        onAction={insertTemplate}
        onSubmit={(text) => {
          onSubmit(text);
          setValue("");
        }}
        loading={busy}
        onStop={onCancel}
        disabled={disabled}
        minRows={1}
        maxRows={8}
        maxLength={maxLength}
        placeholder="Para onde você quer ir?"
        aria-label="Mensagem para o Mapi"
        className="rounded-[20px] border-2 border-ink bg-card p-2.5 shadow-[0_3px_0_var(--ink)] focus-within:border-ink [&_textarea]:text-[15px] [&_textarea]:placeholder:text-muted-foreground [&_button[type=submit]]:rounded-full [&_button[type=submit]]:bg-pin [&_button[type=submit]]:text-white [&_button[type=submit]:hover]:bg-pin-deep"
      />
      <div className="flex items-center justify-between gap-4 px-1 text-xs text-muted-foreground">
        <span>Enter envia. Shift + Enter quebra a linha.</span>
        {showCounter ? (
          <span className="tabular-nums" aria-live="polite">
            {value.length}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
}
