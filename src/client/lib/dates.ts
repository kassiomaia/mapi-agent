const MS_PER_DAY = 86_400_000;

function toDate(isoDate: string): Date {
  return new Date(`${isoDate}T00:00:00Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function todayIso(): string {
  const now = new Date();
  return toIso(new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())));
}

export function addDays(isoDate: string, days: number): string {
  return toIso(new Date(toDate(isoDate).getTime() + days * MS_PER_DAY));
}

export function monthOf(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

export function addMonths(monthIso: string, months: number): string {
  const date = toDate(monthIso);
  return toIso(new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, 1)));
}

export function monthGrid(monthIso: string): ReadonlyArray<string | undefined> {
  const first = toDate(monthIso);
  const leading = first.getUTCDay();
  const daysInMonth = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
  const cells: Array<string | undefined> = Array.from({ length: leading }, () => undefined);
  for (let day = 0; day < daysInMonth; day++) cells.push(addDays(monthIso, day));
  while (cells.length % 7 !== 0) cells.push(undefined);
  return cells;
}

export function nightsBetween(start: string, end: string): number {
  return Math.round((toDate(end).getTime() - toDate(start).getTime()) / MS_PER_DAY);
}

const monthTitleFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
const shortFormat = new Intl.DateTimeFormat("pt-BR", { day: "numeric", month: "short", timeZone: "UTC" });
const fullFormat = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});
const numericFormat = new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: "UTC",
});

export function formatMonthTitle(monthIso: string): string {
  const title = monthTitleFormat.format(toDate(monthIso));
  return `${title.charAt(0).toUpperCase()}${title.slice(1)}`;
}

export function formatShortDate(isoDate: string): string {
  return shortFormat.format(toDate(isoDate)).replace(".", "");
}

export function formatFullDate(isoDate: string): string {
  return fullFormat.format(toDate(isoDate));
}

export function formatNumericDate(isoDate: string): string {
  return numericFormat.format(toDate(isoDate));
}

export const WEEKDAY_INITIALS: ReadonlyArray<Readonly<{ short: string; long: string }>> = [
  { short: "D", long: "domingo" },
  { short: "S", long: "segunda-feira" },
  { short: "T", long: "terça-feira" },
  { short: "Q", long: "quarta-feira" },
  { short: "Q", long: "quinta-feira" },
  { short: "S", long: "sexta-feira" },
  { short: "S", long: "sábado" },
];
