import { z } from "zod";
import { geodesicDistanceKm, geodesicPath, pathCopies, unwrapLongitude } from "../services/geodesy.js";
import { geocodeCity } from "../services/open-meteo.js";
import { defineTool } from "./define-tool.js";
import type { CalculateDistanceInput, DistancePair, DistanceResult, LocatedCity } from "./types.js";

const inputSchema = z.object({
  cities: z
    .array(z.string().trim().min(1))
    .min(2)
    .max(10)
    .describe(
      "Lista de 2 a 10 cidades. Para nomes ambíguos ou traduzidos, use o nome em inglês ou no idioma local, por exemplo: [\"Lisboa\", \"New York\", \"Tokyo\"]",
    ),
});

const kilometerFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

async function locate(city: string): Promise<LocatedCity> {
  const place = await geocodeCity(city);
  if (!place) {
    throw new Error(`City not found: ${city}`);
  }
  return {
    city: place.name,
    country: place.country,
    latitude: place.latitude,
    longitude: place.longitude,
  };
}

function alignLongitudes(cities: ReadonlyArray<LocatedCity>): ReadonlyArray<LocatedCity> {
  const reference = cities[0]?.longitude ?? 0;
  return cities.map((city) => ({ ...city, longitude: unwrapLongitude(city.longitude, reference) }));
}

async function calculateDistance({ cities }: CalculateDistanceInput): Promise<DistanceResult> {
  const places = alignLongitudes(await Promise.all(cities.map(locate)));
  const pairs: DistancePair[] = [];

  places.forEach((from, index) => {
    for (const to of places.slice(index + 1)) {
      pairs.push({
        from: from.city,
        to: to.city,
        kilometers: geodesicDistanceKm(from, to),
        paths: pathCopies(geodesicPath(from, to), to.longitude),
      });
    }
  });

  return { places, pairs };
}

function formatOutput(result: DistanceResult): string {
  const located = result.places.map((place) => `${place.city} (${place.country})`).join(", ");
  const distances = result.pairs.map(
    (pair) => `${pair.from} ↔ ${pair.to}: ${pair.kilometers.toFixed(1)} km`,
  );
  return [`Cidades encontradas: ${located}`, ...distances].join("\n");
}

export const calculateDistanceTool = defineTool({
  name: "calculate_distance",
  description:
    "Calcula a distância geodésica, em quilômetros (elipsoide WGS84), entre todos os pares de uma lista de cidades. " +
    "O resultado informa o país de cada cidade encontrada; se alguma não for a cidade pretendida, chame de novo com um nome mais específico. " +
    "O resultado é exibido automaticamente ao usuário em um mapa com as rotas.",
  inputSchema,
  execute: calculateDistance,
  formatOutput,
  present: (result) => ({
    title: `Distância geodésica: ${result.pairs
      .map((pair) => `${pair.from} ↔ ${pair.to} (${kilometerFormat.format(pair.kilometers)} km)`)
      .join(", ")}`,
    blocks: [
      {
        type: "map",
        points: result.places.map((place) => ({
          name: place.city,
          latitude: place.latitude,
          longitude: place.longitude,
        })),
        routes: result.pairs.map((pair) => ({
          from: pair.from,
          to: pair.to,
          kilometers: pair.kilometers,
          paths: pair.paths,
        })),
      },
    ],
  }),
});
