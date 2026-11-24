export type PhotoSection = "itinerary" | "attractions" | "food" | "neighborhoods";

export function photoKey(section: PhotoSection, index: number): string {
  return `${section}:${index}`;
}
