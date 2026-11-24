import type { z } from "zod";
import type { FlightSummary, PlanPlace, TripPlanContent, TripSource } from "../planner/types.js";
import type { CityPhoto, Forecast, WeatherOutlookData } from "../services/types.js";
import type { blockSchema, leafBlockSchema, uiSpecSchema } from "./schema.js";

export type ModelUiSpec = z.output<typeof uiSpecSchema>;

export type ModelUiBlock = z.output<typeof blockSchema>;

export type UiLeafBlock = z.output<typeof leafBlockSchema>;

export type MapPoint = Readonly<{
  name: string;
  latitude: number;
  longitude: number;
}>;

export type MapRoute = Readonly<{
  from: string;
  to: string;
  kilometers: number;
  paths: ReadonlyArray<ReadonlyArray<Readonly<{ latitude: number; longitude: number }>>>;
}>;

export type MapBlock = Readonly<{
  type: "map";
  points: ReadonlyArray<MapPoint>;
  routes: ReadonlyArray<MapRoute>;
}>;

export type GalleryPhoto = CityPhoto;

export type GalleryBlock = Readonly<{
  type: "gallery";
  photos: ReadonlyArray<GalleryPhoto>;
}>;

export type WebResult = Readonly<{
  title: string;
  url: string;
  site: string;
  snippet: string;
  price: string | undefined;
}>;

export type WebResultsBlock = Readonly<{
  type: "web_results";
  query: string;
  note: string;
  results: ReadonlyArray<WebResult>;
}>;

export type TripPlanBlock = Readonly<{
  type: "trip_plan";
  destination: PlanPlace;
  origin: PlanPlace | undefined;
  distanceKm: number | undefined;
  departureDate: string | undefined;
  returnDate: string | undefined;
  travelers: number;
  timeDifference: string | undefined;
  photos: ReadonlyArray<CityPhoto>;
  forecast: Forecast | undefined;
  outlook: WeatherOutlookData | undefined;
  flights: FlightSummary | undefined;
  content: TripPlanContent;
  itemPhotos: Readonly<Record<string, CityPhoto>>;
  sources: ReadonlyArray<TripSource>;
}>;

export type TripDetailsFormBlock = Readonly<{
  type: "trip_details_form";
  purpose: "plan" | "flights";
  destination: string | undefined;
  origin: string | undefined;
  departureDate: string | undefined;
  returnDate: string | undefined;
  travelers: number | undefined;
  interests: ReadonlyArray<string> | undefined;
}>;

export type WeatherOutlookBlock = WeatherOutlookData &
  Readonly<{
    type: "weather_outlook";
    city: string;
    country: string;
  }>;

export type CodeRunCell = string | number | boolean | null;

export type CodeRunDisplay =
  | Readonly<{ kind: "table"; columns: ReadonlyArray<string>; rows: ReadonlyArray<ReadonlyArray<CodeRunCell>> }>
  | Readonly<{ kind: "stats"; items: ReadonlyArray<Readonly<{ label: string; value: CodeRunCell }>> }>
  | Readonly<{ kind: "list"; items: ReadonlyArray<string> }>
  | Readonly<{ kind: "json"; text: string }>;

export type CodeRunBlock = Readonly<{
  type: "code_run";
  goal: string;
  code: string;
  status: "ok" | "error";
  durationMs: number;
  logs: ReadonlyArray<string>;
  error?: string | undefined;
  display?: CodeRunDisplay | undefined;
}>;

export type UiBlock =
  | ModelUiBlock
  | WeatherOutlookBlock
  | MapBlock
  | GalleryBlock
  | WebResultsBlock
  | TripPlanBlock
  | TripDetailsFormBlock
  | CodeRunBlock;

export type UiSpec = Readonly<{
  title?: string | undefined;
  blocks: ReadonlyArray<UiBlock>;
}>;

export type UiSpecParseResult =
  | Readonly<{ ok: true; spec: ModelUiSpec }>
  | Readonly<{ ok: false; error: string }>;
