import { CalendarCheck, Minus, Plus } from "lucide-react";
import { useId, useState, type FormEvent } from "react";
import { cn } from "@/components/beui/lib/utils";
import type { TripDetailsFormBlock } from "../../../agents/generative-ui/types.js";
import { formatNumericDate, formatShortDate, nightsBetween, todayIso } from "../../lib/dates.js";
import { useChatActions } from "../chat-actions.js";
import { DateRangeCalendar, type DateRange } from "./date-range-calendar.js";

const INTEREST_OPTIONS = ["Gastronomia", "Museus", "História", "Praia", "Natureza", "Vida noturna", "Compras", "Arte"];
const MAX_PEOPLE = 9;

const inputClass =
  "h-10 w-full rounded-[var(--radius-control)] border-[1.5px] border-input bg-card px-3 text-[15px] text-ink outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ink disabled:opacity-60";

type Stepper = Readonly<{ label: string; hint: string; value: number; min: number; onChange: (value: number) => void }>;

function StepperField({ label, hint, value, min, onChange }: Stepper) {
  const id = useId();
  return (
    <div className="flex items-center justify-between gap-4 py-2" role="group" aria-labelledby={id}>
      <span className="flex flex-col">
        <span id={id} className="text-sm font-medium text-ink">
          {label}
        </span>
        <span className="text-xs text-muted-foreground">{hint}</span>
      </span>
      <span className="flex items-center gap-3">
        <button
          type="button"
          aria-label={`Menos ${label.toLowerCase()}`}
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          className="grid size-8 place-items-center rounded-full border-[1.5px] border-ink/30 text-ink outline-none hover:border-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <output className="w-5 text-center font-display text-lg font-semibold tabular-nums text-ink" aria-live="polite">
          {value}
        </output>
        <button
          type="button"
          aria-label={`Mais ${label.toLowerCase()}`}
          disabled={value >= MAX_PEOPLE}
          onClick={() => onChange(value + 1)}
          className="grid size-8 place-items-center rounded-full border-[1.5px] border-ink/30 text-ink outline-none hover:border-ink focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}

function describePeople(adults: number, children: number): string {
  const total = adults + children;
  const adultsText = `${adults} ${adults === 1 ? "adulto" : "adultos"}`;
  if (children === 0) return `${total} ${total === 1 ? "pessoa" : "pessoas"} (${adultsText})`;
  return `${total} pessoas (${adultsText} e ${children} ${children === 1 ? "criança" : "crianças"})`;
}

type FormValues = Readonly<{
  destination: string;
  origin: string;
  range: DateRange;
  oneWay: boolean;
  adults: number;
  children: number;
  interests: ReadonlyArray<string>;
}>;

function composeRequest(purpose: TripDetailsFormBlock["purpose"], values: FormValues): string {
  const { destination, origin, range, oneWay, adults, children, interests } = values;
  const people = describePeople(adults, children);
  const departure = range.start ? formatNumericDate(range.start) : "";
  const back = range.end ? formatNumericDate(range.end) : "";
  if (purpose === "flights") {
    const dates = oneWay ? `só ida em ${departure}` : `ida em ${departure} e volta em ${back}`;
    return `Pesquise passagens de ${origin.trim()} para ${destination.trim()}, ${dates}, para ${people}.`;
  }
  const from = origin.trim() ? ` saindo de ${origin.trim()}` : "";
  const likes = interests.length > 0 ? ` Interesses: ${interests.join(", ").toLowerCase()}.` : "";
  return `Monte o plano completo de viagem para ${destination.trim()}${from}, com ida em ${departure} e volta em ${back}, para ${people}.${likes}`;
}

function initialInterests(block: TripDetailsFormBlock): ReadonlyArray<string> {
  const wanted = (block.interests ?? []).map((interest) => interest.toLowerCase());
  return INTEREST_OPTIONS.filter((option) => wanted.some((interest) => option.toLowerCase().includes(interest) || interest.includes(option.toLowerCase())));
}

export function TripDetailsForm({ block }: { block: TripDetailsFormBlock }) {
  const { send, canSend, current } = useChatActions();
  const isPlan = block.purpose === "plan";
  const today = todayIso();
  const [values, setValues] = useState<FormValues>(() => ({
    destination: block.destination ?? "",
    origin: block.origin ?? "",
    range: {
      start: block.departureDate && block.departureDate >= today ? block.departureDate : undefined,
      end: block.returnDate && block.returnDate >= today ? block.returnDate : undefined,
    },
    oneWay: false,
    adults: Math.max(1, Math.min(MAX_PEOPLE, block.travelers ?? 1)),
    children: 0,
    interests: initialInterests(block),
  }));
  const [sent, setSent] = useState<string | undefined>(undefined);
  const destinationId = useId();
  const originId = useId();

  const update = (patch: Partial<FormValues>): void => setValues((previous) => ({ ...previous, ...patch }));
  const { range, oneWay } = values;
  const datesReady = range.start !== undefined && (oneWay || range.end !== undefined);
  const originReady = isPlan || values.origin.trim() !== "";
  const ready = values.destination.trim() !== "" && originReady && datesReady;
  const locked = sent !== undefined || !current;

  const onSubmit = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!ready || locked || !canSend) return;
    const request = composeRequest(block.purpose, values);
    setSent(request);
    send(request);
  };

  if (sent !== undefined || !current) {
    return (
      <div className="flex w-full items-start gap-3 rounded-[var(--radius-card)] border-[1.5px] border-border bg-card px-4 py-3">
        <CalendarCheck className="mt-0.5 size-5 shrink-0 text-[#2f7a2a]" aria-hidden="true" />
        <p className="text-sm leading-6 text-muted-foreground">
          {sent ? "Detalhes enviados." : "Formulário não enviado."}
        </p>
      </div>
    );
  }

  const toggleInterest = (interest: string): void =>
    update({
      interests: values.interests.includes(interest)
        ? values.interests.filter((item) => item !== interest)
        : [...values.interests, interest],
    });

  const summary = range.start
    ? oneWay || !range.end
      ? `Ida em ${formatShortDate(range.start)}${oneWay ? "" : ". Agora escolha a volta"}`
      : `${formatShortDate(range.start)} a ${formatShortDate(range.end)}, ${nightsBetween(range.start, range.end)} ${nightsBetween(range.start, range.end) === 1 ? "noite" : "noites"}`
    : "Escolha a data de ida";

  return (
    <form
      onSubmit={onSubmit}
      className="flex w-full flex-col gap-5 rounded-[var(--radius-card)] border-[1.5px] border-border bg-card p-4 sm:p-5"
      aria-label={isPlan ? "Detalhes para o plano de viagem" : "Detalhes para a busca de passagens"}
    >
      <div className="flex flex-col gap-1">
        <h3 className="font-display text-xl leading-7 font-semibold text-ink">Quando e com quem?</h3>
        <p className="text-sm text-muted-foreground">
          {isPlan
            ? "Escolha o período no calendário e quem vai junto. Com isso eu monto o plano completo."
            : "Escolha as datas e quantas pessoas vão. Com isso eu pesquiso as passagens."}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor={originId} className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          {isPlan ? "Saindo de (opcional)" : "Saindo de"}
          <input
            id={originId}
            value={values.origin}
            onChange={(event) => update({ origin: event.target.value })}
            placeholder="São Paulo"
            autoComplete="off"
            className={inputClass}
          />
        </label>
        <label htmlFor={destinationId} className="flex flex-col gap-1.5 text-sm font-medium text-ink">
          Destino
          <input
            id={destinationId}
            value={values.destination}
            onChange={(event) => update({ destination: event.target.value })}
            placeholder="Lisboa"
            autoComplete="off"
            className={inputClass}
          />
        </label>
      </div>

      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">Período da viagem</legend>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium text-ink" aria-live="polite">
            {summary}
          </p>
          {!isPlan ? (
            <label className="flex cursor-pointer items-center gap-2 text-sm text-ink">
              <input
                type="checkbox"
                checked={oneWay}
                onChange={(event) =>
                  update({ oneWay: event.target.checked, range: { start: range.start, end: undefined } })
                }
                className="size-4 accent-[var(--ink)]"
              />
              Só ida
            </label>
          ) : null}
        </div>
        <div className="rounded-[var(--radius-control)] border-[1.5px] border-border p-3">
          <DateRangeCalendar value={range} min={today} oneWay={oneWay} onChange={(next) => update({ range: next })} />
        </div>
      </fieldset>

      <fieldset className="flex flex-col">
        <legend className="mb-1 text-sm font-medium text-ink">Quem vai</legend>
        <div className="flex flex-col divide-y divide-border">
          <StepperField
            label="Adultos"
            hint="A partir de 12 anos"
            value={values.adults}
            min={1}
            onChange={(adults) => update({ adults })}
          />
          <StepperField
            label="Crianças"
            hint="Até 11 anos"
            value={values.children}
            min={0}
            onChange={(children) => update({ children })}
          />
        </div>
      </fieldset>

      {isPlan ? (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">O que vocês curtem (opcional)</legend>
          <div className="flex flex-wrap gap-2">
            {INTEREST_OPTIONS.map((interest) => {
              const selected = values.interests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleInterest(interest)}
                  className={cn(
                    "h-8 rounded-full border-[1.5px] px-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
                    selected
                      ? "border-ink bg-island text-ink"
                      : "border-input bg-card text-muted-foreground hover:border-ink/60 hover:text-ink",
                  )}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-col-reverse gap-3 border-t-[1.5px] border-dashed border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-muted-foreground">
          {ready
            ? describePeople(values.adults, values.children)
            : !datesReady
              ? "Falta escolher as datas no calendário."
              : !originReady
                ? "Falta a cidade de origem."
                : "Falta o destino."}
        </p>
        <button
          type="submit"
          disabled={!ready || !canSend}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-full border-2 border-ink bg-pin px-5 text-sm font-semibold text-white shadow-[0_2px_0_var(--ink)] outline-none transition-[transform,box-shadow,background-color] hover:bg-pin-deep focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 active:translate-y-[2px] active:shadow-none disabled:pointer-events-none disabled:opacity-40"
        >
          {isPlan ? "Montar meu plano" : "Buscar passagens"}
        </button>
      </div>
    </form>
  );
}
