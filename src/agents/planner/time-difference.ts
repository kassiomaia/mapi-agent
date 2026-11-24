const REFERENCE_TIMEZONE = "America/Sao_Paulo";
const OFFSET_PATTERN = /GMT(?:([+-])(\d{1,2})(?::(\d{2}))?)?/;

function utcOffsetMinutes(timeZone: string, at: Date): number | undefined {
  try {
    const name = new Intl.DateTimeFormat("en-US", { timeZone, timeZoneName: "longOffset" })
      .formatToParts(at)
      .find((part) => part.type === "timeZoneName")?.value;
    const match = name ? OFFSET_PATTERN.exec(name) : null;
    if (!match) return undefined;
    const [, sign, hours = "0", minutes = "0"] = match;
    const total = Number(hours) * 60 + Number(minutes);
    return sign === "-" ? -total : total;
  } catch {
    return undefined;
  }
}

function formatHours(minutes: number): string {
  const hours = Math.abs(minutes) / 60;
  const value = Number.isInteger(hours) ? String(hours) : hours.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
  return `${value} ${hours === 1 ? "hora" : "horas"}`;
}

export function describeTimeDifference(timeZone: string, at: Date): string | undefined {
  const destination = utcOffsetMinutes(timeZone, at);
  const reference = utcOffsetMinutes(REFERENCE_TIMEZONE, at);
  if (destination === undefined || reference === undefined) return undefined;
  const difference = destination - reference;
  if (difference === 0) return "Mesmo horário de Brasília";
  return difference > 0
    ? `${formatHours(difference)} à frente de Brasília`
    : `${formatHours(difference)} atrás de Brasília`;
}
