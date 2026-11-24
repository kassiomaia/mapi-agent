import type { ChatContext, CityEntity, Entity, Turn } from "./types.js";

const RECENT_TURNS_LIMIT = 6;

function normalizeId(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim()
    .toLowerCase();
}

function cityNamesFromToolCall(toolName: string, input: unknown): ReadonlyArray<string> {
  if (typeof input !== "object" || input === null) return [];
  const fields = input as Readonly<Record<string, unknown>>;

  switch (toolName) {
    case "get_weather":
    case "get_coordinates":
    case "get_forecast":
    case "get_city_photos":
      return typeof fields.city === "string" ? [fields.city] : [];
    case "search_flights":
    case "plan_trip":
      return [fields.origin, fields.destination].filter((city): city is string => typeof city === "string");
    case "calculate_distance":
      return Array.isArray(fields.cities)
        ? fields.cities.filter((city): city is string => typeof city === "string")
        : [];
    default:
      return [];
  }
}

function plannedDestination(input: unknown): string | undefined {
  if (typeof input !== "object" || input === null) return undefined;
  const destination = (input as Readonly<Record<string, unknown>>).destination;
  return typeof destination === "string" ? destination : undefined;
}

export function createChatContext(): ChatContext {
  const entities = new Map<string, Entity>();
  const turns: Turn[] = [];
  const plannedCities = new Set<string>();
  let pendingMentions: string[] = [];

  function registerEntity(name: string): string {
    const id = normalizeId(name);
    if (!entities.has(id)) {
      const entity: CityEntity = { kind: "City", id, name: name.trim() };
      entities.set(id, entity);
    }
    return id;
  }

  return {
    registerToolCall(toolName, input) {
      for (const name of cityNamesFromToolCall(toolName, input)) {
        pendingMentions.push(registerEntity(name));
      }
      const destination = toolName === "plan_trip" ? plannedDestination(input) : undefined;
      if (destination) plannedCities.add(registerEntity(destination));
    },

    recordTurn(prompt, accepted) {
      turns.push({ prompt, accepted, mentions: [...new Set(pendingMentions)] });
      pendingMentions = [];
    },

    describe() {
      const cityNames = [...entities.values()].map((entity) => entity.name);
      const plannedNames = [...plannedCities].map((id) => entities.get(id)?.name ?? id);
      const lastAccepted = [...turns].reverse().find((turn) => turn.accepted);
      const lastCities = lastAccepted
        ? lastAccepted.mentions.map((id) => entities.get(id)?.name ?? id)
        : [];
      const recent = turns
        .filter((turn) => turn.accepted)
        .slice(-RECENT_TURNS_LIMIT)
        .map((turn) => `- ${turn.prompt}`);

      return [
        `Cidades já consultadas nesta conversa: ${cityNames.length > 0 ? cityNames.join(", ") : "nenhuma"}.`,
        `Cidades com plano completo já exibido (com fotos, clima, passagens, atrações, comida, bairros, dicas e orçamento): ${plannedNames.length > 0 ? plannedNames.join(", ") : "nenhuma"}.`,
        `Cidades da última pergunta aceita: ${lastCities.length > 0 ? lastCities.join(", ") : "nenhuma"}.`,
        "Perguntas aceitas anteriores (mais antigas primeiro):",
        recent.length > 0 ? recent.join("\n") : "(nenhuma)",
      ].join("\n");
    },
  };
}
