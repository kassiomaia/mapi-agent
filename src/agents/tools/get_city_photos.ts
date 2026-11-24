import { z } from "zod";
import { geocodeCity } from "../services/open-meteo.js";
import { fetchCityPhotos } from "../services/wikimedia.js";
import { defineTool } from "./define-tool.js";
import type { CityPhotos, GetCityPhotosInput } from "./types.js";

const inputSchema = z.object({
  city: z
    .string()
    .trim()
    .min(1)
    .describe("Nome da cidade. Para nomes ambíguos ou traduzidos, use o nome em inglês ou no idioma local, por exemplo: New York, Lisboa"),
  limit: z.number().int().min(1).max(8).default(4).describe("Quantidade máxima de fotos, de 1 a 8. Padrão: 4"),
});

async function getCityPhotos({ city, limit }: GetCityPhotosInput): Promise<CityPhotos> {
  const place = await geocodeCity(city);
  if (!place) {
    throw new Error(`City not found: ${city}`);
  }
  const photos = await fetchCityPhotos(place.geonamesIds, limit);
  if (photos.length === 0) {
    throw new Error(`No photos found for ${place.name} (${place.country})`);
  }
  return { city: place.name, country: place.country, photos };
}

function formatOutput(result: CityPhotos): string {
  const lines = result.photos.map(
    (photo, index) => `${index + 1}. ${photo.description} (${photo.author}, ${photo.license})`,
  );
  return [`${result.photos.length} fotos de ${result.city} (${result.country}), exibidas ao usuário:`, ...lines].join(
    "\n",
  );
}

export const getCityPhotosTool = defineTool({
  name: "get_city_photos",
  description:
    "Busca fotos de uma cidade no Wikimedia Commons (as mesmas usadas no artigo da Wikipedia sobre a cidade), com autor e licença. " +
    "As fotos são exibidas automaticamente ao usuário em uma galeria; o resultado traz só a descrição de cada foto. " +
    "O resultado informa o país da cidade encontrada; se não for a cidade pretendida, chame de novo com um nome mais específico.",
  inputSchema,
  execute: getCityPhotos,
  formatOutput,
  present: (result) => ({
    title: `Fotos de ${result.city} (${result.country})`,
    blocks: [{ type: "gallery", photos: result.photos }],
  }),
});
