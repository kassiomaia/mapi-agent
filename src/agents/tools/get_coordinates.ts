import { z } from "zod";
import { geocodeCity } from "../services/open-meteo.js";
import { defineTool } from "./define-tool.js";
import type { Coordinates, GetCoordinatesInput } from "./types.js";

const inputSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .describe("Nome da cidade. Para nomes ambíguos ou traduzidos, use o nome em inglês ou no idioma local, por exemplo: New York, Lisboa"),
});

async function getCoordinates({ city }: GetCoordinatesInput): Promise<Coordinates> {
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

export const getCoordinatesTool = defineTool({
  name: "get_coordinates",
  description: "Retorna a latitude e a longitude de uma cidade, usando a API de geocodificação Open-Meteo.",
  inputSchema,
  execute: getCoordinates,
  formatOutput: (coordinates) =>
    `${coordinates.city} (${coordinates.country}): latitude ${coordinates.latitude}, longitude ${coordinates.longitude}`,
});
