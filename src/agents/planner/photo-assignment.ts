import type { CityPhoto } from "../services/types.js";
import { photoKey, type PhotoSection } from "./photo-keys.js";
import type { TripPlanContent } from "./types.js";

const SECTION_PRIORITY: ReadonlyArray<PhotoSection> = ["attractions", "food", "neighborhoods", "itinerary"];

export type PhotoAssignment = Readonly<{
  itemPhotos: Readonly<Record<string, CityPhoto>>;
  gallery: ReadonlyArray<CityPhoto>;
}>;

function photoId(photo: CityPhoto): string {
  return photo.file.toLowerCase();
}

function titlesOf(content: TripPlanContent, section: PhotoSection): ReadonlyArray<string> {
  return content[section].map((item) => item.wikipediaTitle);
}

export function itemTitles(content: TripPlanContent): ReadonlyArray<string> {
  return SECTION_PRIORITY.flatMap((section) => titlesOf(content, section));
}

export function assignPhotos(
  content: TripPlanContent,
  photosByTitle: ReadonlyMap<string, CityPhoto>,
  cityPhotos: ReadonlyArray<CityPhoto>,
): PhotoAssignment {
  const [cover, ...otherCityPhotos] = cityPhotos;
  const used = new Set<string>(cover ? [photoId(cover)] : []);
  const itemPhotos: Record<string, CityPhoto> = {};

  for (const section of SECTION_PRIORITY) {
    titlesOf(content, section).forEach((title, index) => {
      const photo = photosByTitle.get(title);
      if (!photo || used.has(photoId(photo))) return;
      used.add(photoId(photo));
      itemPhotos[photoKey(section, index)] = photo;
    });
  }

  const gallery = [
    ...(cover ? [cover] : []),
    ...otherCityPhotos.filter((photo) => !used.has(photoId(photo))),
  ];
  return { itemPhotos, gallery };
}
