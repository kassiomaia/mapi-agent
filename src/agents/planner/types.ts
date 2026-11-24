import type { z } from "zod";
import type { CityPhoto, Forecast, WeatherOutlookData, WebPage } from "../services/types.js";
import type { tripPlanContentSchema } from "./schema.js";

export type TripPlanContent = z.output<typeof tripPlanContentSchema>;

export type PlanTripInput = Readonly<{
  destination: string;
  origin?: string | undefined;
  departureDate?: string | undefined;
  returnDate?: string | undefined;
  travelers: number;
  interests?: ReadonlyArray<string> | undefined;
}>;

export type ResearchTopicId = "attractions" | "food" | "stay" | "tips" | "events" | "budget";

export type ResearchTopic = Readonly<{
  id: ResearchTopicId;
  label: string;
  query: string;
}>;

export type ResearchNotes = Readonly<{
  topic: ResearchTopic;
  pages: ReadonlyArray<WebPage>;
}>;

export type PlanPlace = Readonly<{
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}>;

export type FlightSummary = Readonly<{
  query: string;
  cheapest: string | undefined;
  offers: ReadonlyArray<Readonly<{ title: string; url: string; site: string; price: string | undefined }>>;
}>;

export type TripResearch = Readonly<{
  input: PlanTripInput;
  destination: PlanPlace;
  origin: PlanPlace | undefined;
  distanceKm: number | undefined;
  forecast: Forecast | undefined;
  outlook: WeatherOutlookData | undefined;
  photos: ReadonlyArray<CityPhoto>;
  flights: FlightSummary | undefined;
  notes: ReadonlyArray<ResearchNotes>;
  days: number;
  timeDifference: string | undefined;
}>;

export type TripSource = Readonly<{
  title: string;
  url: string;
  site: string;
}>;

export type TripPlan = Readonly<{
  research: TripResearch;
  content: TripPlanContent;
  itemPhotos: Readonly<Record<string, CityPhoto>>;
  sources: ReadonlyArray<TripSource>;
}>;
