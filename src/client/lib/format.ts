function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const OPERATION_SYMBOLS: Readonly<Record<string, string>> = {
  add: "+",
  subtract: "−",
  multiply: "×",
  divide: "÷",
};

export function describeToolInput(name: string, input: unknown): string {
  if (!isRecord(input)) return "";
  if (name === "calculate") {
    const symbol = OPERATION_SYMBOLS[String(input.operation)] ?? String(input.operation);
    return `${String(input.a)} ${symbol} ${String(input.b)}`;
  }
  if (name === "search_flights") {
    const dates = [input.departureDate, input.returnDate].filter((date) => typeof date === "string").join(" – ");
    return `${String(input.origin)} → ${String(input.destination)}${dates ? `, ${dates}` : ""}`;
  }
  if (name === "plan_trip") {
    const origin = typeof input.origin === "string" ? `${input.origin} → ` : "";
    return `${origin}${String(input.destination)}`;
  }
  if (name === "get_forecast" && typeof input.city === "string") {
    const period = [input.startDate, input.endDate].filter((date) => typeof date === "string").join(" a ");
    return period ? `${input.city}, ${period}` : input.city;
  }
  if (name === "run_javascript" && typeof input.goal === "string") return input.goal;
  if (typeof input.city === "string") return input.city;
  if (Array.isArray(input.cities)) return input.cities.map(String).join(", ");
  return JSON.stringify(input);
}
