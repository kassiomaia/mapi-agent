import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { cn } from "@/components/beui/lib/utils";
import {
  addDays,
  addMonths,
  formatFullDate,
  formatMonthTitle,
  monthGrid,
  monthOf,
  WEEKDAY_INITIALS,
} from "../../lib/dates.js";

export type DateRange = Readonly<{ start: string | undefined; end: string | undefined }>;

type DateRangeCalendarProps = Readonly<{
  value: DateRange;
  min: string;
  oneWay: boolean;
  disabled?: boolean;
  onChange: (range: DateRange) => void;
}>;

const WIDE_QUERY = "(min-width: 640px)";
const RANGE_FILL = "rgb(255 210 63 / 0.38)";

function useWideLayout(): boolean {
  const [wide, setWide] = useState(() => window.matchMedia(WIDE_QUERY).matches);
  useEffect(() => {
    const query = window.matchMedia(WIDE_QUERY);
    const update = (): void => setWide(query.matches);
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return wide;
}

const KEY_STEPS: Readonly<Record<string, number>> = {
  ArrowLeft: -1,
  ArrowRight: 1,
  ArrowUp: -7,
  ArrowDown: 7,
};

export function DateRangeCalendar({ value, min, oneWay, disabled = false, onChange }: DateRangeCalendarProps) {
  const wide = useWideLayout();
  const monthCount = wide ? 2 : 1;
  const initial = value.start ?? min;
  const [view, setView] = useState(() => monthOf(initial));
  const [focused, setFocused] = useState(initial);
  const [hovered, setHovered] = useState<string | undefined>(undefined);
  const gridRef = useRef<HTMLDivElement>(null);
  const moveFocus = useRef(false);

  const months = Array.from({ length: monthCount }, (_, index) => addMonths(view, index));
  const lastMonth = months[months.length - 1] ?? view;
  const selectingEnd = !oneWay && value.start !== undefined && value.end === undefined;
  const rangeEnd = value.end ?? (selectingEnd && hovered && hovered > (value.start ?? "") ? hovered : undefined);

  useEffect(() => {
    if (!moveFocus.current) return;
    moveFocus.current = false;
    gridRef.current?.querySelector<HTMLButtonElement>(`[data-date="${focused}"]`)?.focus();
  }, [focused, view]);

  const reveal = (date: string): void => {
    const month = monthOf(date);
    if (month < view) setView(month);
    else if (month > lastMonth) setView(addMonths(month, -(monthCount - 1)));
  };

  const select = (date: string): void => {
    setFocused(date);
    if (oneWay || !value.start || value.end || date <= value.start) {
      onChange({ start: date, end: undefined });
    } else {
      onChange({ start: value.start, end: date });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    let next: string | undefined;
    const step = KEY_STEPS[event.key];
    if (step !== undefined) next = addDays(focused, step);
    else if (event.key === "PageUp") next = addMonths(focused, -1);
    else if (event.key === "PageDown") next = addMonths(focused, 1);
    if (!next) return;
    event.preventDefault();
    const target = next < min ? min : next;
    moveFocus.current = true;
    setFocused(target);
    reveal(target);
  };

  const canGoBack = view > monthOf(min);

  return (
    <div className="flex flex-col gap-2" onMouseLeave={() => setHovered(undefined)}>
      <div className="relative">
        <div className="grid gap-6 sm:grid-cols-2" aria-live="polite">
          {months.map((month) => (
            <h5 key={month} className="py-1.5 text-center font-display text-[15px] font-semibold text-ink">
              {formatMonthTitle(month)}
            </h5>
          ))}
        </div>
        <button
          type="button"
          aria-label="Mês anterior"
          disabled={disabled || !canGoBack}
          onClick={() => setView(addMonths(view, -1))}
          className="absolute top-0 left-0 grid size-8 place-items-center rounded-full text-ink outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label="Próximo mês"
          disabled={disabled}
          onClick={() => setView(addMonths(view, 1))}
          className="absolute top-0 right-0 grid size-8 place-items-center rounded-full text-ink outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30"
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </div>

      <div ref={gridRef} className="grid gap-6 sm:grid-cols-2" onKeyDown={onKeyDown}>
        {months.map((month) => (
          <div key={month} className="flex flex-col gap-1.5">
            <div className="grid grid-cols-7">
              {WEEKDAY_INITIALS.map((weekday) => (
                <abbr
                  key={weekday.long}
                  title={weekday.long}
                  className="pb-1 text-center text-xs text-muted-foreground no-underline"
                >
                  {weekday.short}
                </abbr>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
              {monthGrid(month).map((date, index) => {
                if (!date) return <span key={`${month}-${index}`} />;
                const isStart = date === value.start;
                const isEnd = date === value.end;
                const inRange =
                  value.start !== undefined && rangeEnd !== undefined && date > value.start && date < rangeEnd;
                const edgeOfRange = rangeEnd !== undefined && (isStart || date === rangeEnd);
                const unavailable = date < min;
                const fill = inRange
                  ? RANGE_FILL
                  : edgeOfRange && isStart
                    ? `linear-gradient(to right, transparent 50%, ${RANGE_FILL} 50%)`
                    : edgeOfRange
                      ? `linear-gradient(to left, transparent 50%, ${RANGE_FILL} 50%)`
                      : undefined;
                const label = `${formatFullDate(date)}${isStart ? ", ida" : ""}${isEnd ? ", volta" : ""}`;
                return (
                  <div key={date} className="flex justify-center" style={fill ? { background: fill } : undefined}>
                    <button
                      type="button"
                      data-date={date}
                      tabIndex={date === focused ? 0 : -1}
                      disabled={disabled || unavailable}
                      aria-label={label}
                      aria-pressed={isStart || isEnd}
                      onClick={() => select(date)}
                      onMouseEnter={() => setHovered(date)}
                      onFocus={() => setFocused(date)}
                      className={cn(
                        "grid size-9 place-items-center rounded-full text-sm tabular-nums text-ink outline-none transition-colors",
                        "hover:bg-route/60 focus-visible:ring-2 focus-visible:ring-ring",
                        date === min && !isStart && !isEnd && "font-semibold underline decoration-pin decoration-2 underline-offset-4",
                        (isStart || isEnd) && "border-2 border-ink bg-ink font-semibold text-white hover:bg-ink",
                        unavailable && "text-muted-foreground/40 hover:bg-transparent",
                      )}
                    >
                      {Number(date.slice(8))}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
