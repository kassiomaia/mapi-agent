// JavaScript evaluated inside the sandbox before the agent's code. It becomes the global `helpers`.
export const HELPERS_SOURCE = `
const EARTH_RADIUS_KM = 6371;
const BRUTE_FORCE_LIMIT = 8;

function toPoint(place) {
  const lat = place.lat ?? place.latitude;
  const lon = place.lon ?? place.longitude;
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new TypeError("helpers precisa de pontos com lat e lon: " + JSON.stringify(place).slice(0, 80));
  }
  return { lat, lon };
}

function parseNumberToken(token) {
  const hasDot = token.includes("."), hasComma = token.includes(",");
  let normalized = token;
  if (hasDot && hasComma) {
    const decimal = token.lastIndexOf(",") > token.lastIndexOf(".") ? "," : ".";
    const thousands = decimal === "," ? "." : ",";
    normalized = token.split(thousands).join("").replace(decimal, ".");
  } else if (hasDot || hasComma) {
    const separator = hasDot ? "." : ",";
    const parts = token.split(separator);
    const groupsOfThree = parts.length > 1 && parts.slice(1).every((part) => part.length === 3);
    normalized = groupsOfThree ? parts.join("") : parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  }
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

const helpers = {
  km(a, b) {
    const p = toPoint(a), q = toPoint(b);
    const rad = (deg) => (deg * Math.PI) / 180;
    const dLat = rad(q.lat - p.lat), dLon = rad(q.lon - p.lon);
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(p.lat)) * Math.cos(rad(q.lat)) * Math.sin(dLon / 2) ** 2;
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
  },
  totalKm(route) {
    let total = 0;
    for (let i = 1; i < route.length; i++) total += helpers.km(route[i - 1], route[i]);
    return helpers.round(total, 1);
  },
  nearestNeighbor(points, start = 0) {
    if (points.length === 0) return [];
    const left = points.slice();
    const route = left.splice(start, 1);
    while (left.length > 0) {
      const last = route[route.length - 1];
      let best = 0;
      for (let i = 1; i < left.length; i++) if (helpers.km(last, left[i]) < helpers.km(last, left[best])) best = i;
      route.push(left.splice(best, 1)[0]);
    }
    return route;
  },
  bestOrder(points) {
    if (points.length > BRUTE_FORCE_LIMIT) return helpers.nearestNeighbor(points);
    let best = null, bestKm = Infinity;
    const visit = (route, rest, km) => {
      if (km >= bestKm) return;
      if (rest.length === 0) { best = route; bestKm = km; return; }
      for (let i = 0; i < rest.length; i++) {
        const next = rest[i];
        const added = route.length === 0 ? 0 : helpers.km(route[route.length - 1], next);
        visit(route.concat([next]), rest.slice(0, i).concat(rest.slice(i + 1)), km + added);
      }
    };
    visit([], points, 0);
    return best ?? [];
  },
  daysBetween(from, to) {
    return Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
  },
  addDays(date, days) {
    return new Date(Date.parse(date) + days * 86400000).toISOString().slice(0, 10);
  },
  sum(values) {
    return values.reduce((total, value) => total + (Number(value) || 0), 0);
  },
  average(values) {
    return values.length === 0 ? null : helpers.sum(values) / values.length;
  },
  round(value, digits = 2) {
    const factor = 10 ** digits;
    return Math.round(value * factor) / factor;
  },
  money(text) {
    if (typeof text === "number") return text;
    const token = String(text ?? "").match(/\\d[\\d.,]*/);
    return token ? parseNumberToken(token[0].replace(/[.,]$/, "")) : null;
  },
  range(text) {
    const tokens = String(text ?? "").match(/\\d[\\d.,]*/g) ?? [];
    const values = tokens.map((token) => parseNumberToken(token.replace(/[.,]$/, ""))).filter((value) => value !== null);
    if (values.length === 0) return null;
    return { min: Math.min(...values), max: Math.max(...values) };
  },
};
globalThis.helpers = Object.freeze(helpers);
// Also as globals, so code that calls bestOrder(...) without the helpers prefix still works.
for (const [name, fn] of Object.entries(helpers)) globalThis[name] = fn;
`;
