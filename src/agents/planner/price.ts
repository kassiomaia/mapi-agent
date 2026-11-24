type ParsedPrice = Readonly<{ label: string; currency: string; value: number }>;

const PREFERRED_CURRENCY = "BRL";

function currencyOf(price: string): string {
  if (/R\$|BRL/.test(price)) return "BRL";
  if (/€|EUR/.test(price)) return "EUR";
  if (/US\$|USD|\$/.test(price)) return "USD";
  return "OTHER";
}

function valueOf(price: string): number | undefined {
  const digits = /(\d{1,3}(?:[.\s,]\d{3})*|\d+)(?:,\d{2})?/.exec(price)?.[1];
  if (!digits) return undefined;
  const value = Number(digits.replace(/[.\s,]/g, ""));
  return Number.isFinite(value) ? value : undefined;
}

export function cheapestPrice(prices: ReadonlyArray<string | undefined>): string | undefined {
  const parsed: ParsedPrice[] = prices.flatMap((label) => {
    if (!label) return [];
    const value = valueOf(label);
    return value === undefined ? [] : [{ label, currency: currencyOf(label), value }];
  });
  const preferred = parsed.filter((price) => price.currency === PREFERRED_CURRENCY);
  const pool = preferred.length > 0 ? preferred : parsed.filter((price) => price.currency === parsed[0]?.currency);
  return pool.reduce<ParsedPrice | undefined>(
    (best, price) => (best === undefined || price.value < best.value ? price : best),
    undefined,
  )?.label;
}
