import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import type { UiSpec } from "../generative-ui/types.js";
import type { ModelClient, ToolProgress } from "../types.js";
import type { CityPhoto, Coordinates as GeoPoint, WeatherOutlookData, WebPage } from "../services/types.js";

export type ToolContext = Readonly<{
  client: ModelClient;
  model: string;
  signal: AbortSignal | undefined;
  reportProgress: (progress: ToolProgress) => void;
  toolResults?: ReadonlyArray<ToolRecord> | undefined;
}>;

// Raw output of a tool that already ran in this conversation, kept on the server for run_javascript.
export type ToolRecord = Readonly<{
  tool: string;
  input: unknown;
  output: unknown;
}>;

export type Tool<InputSchema extends z.ZodType, Output> = Readonly<{
  name: string;
  description: string;
  inputSchema: InputSchema;
  execute: (input: z.output<InputSchema>, context: ToolContext) => Promise<Output>;
  formatOutput: (output: Output) => string;
  present?: (output: Output) => UiSpec;
  isError?: (output: Output) => boolean;
}>;

export type ToolExecution = Readonly<{
  text: string;
  ui: UiSpec | undefined;
  output: unknown;
  isError: boolean;
}>;

export type RegisteredTool = Readonly<{
  definition: Anthropic.Tool;
  execute: (input: unknown, context: ToolContext) => Promise<ToolExecution>;
}>;

export type Operation = "add" | "subtract" | "multiply" | "divide";

export type CalculateInput = Readonly<{
  a: number;
  operation: Operation;
  b: number;
}>;

export type GetWeatherInput = Readonly<{
  city: string;
}>;

export type GetCoordinatesInput = Readonly<{
  city: string;
}>;

export type Coordinates = Readonly<{
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}>;

export type CalculateDistanceInput = Readonly<{
  cities: ReadonlyArray<string>;
}>;

export type LocatedCity = Readonly<{
  city: string;
  country: string;
  latitude: number;
  longitude: number;
}>;

export type DistancePair = Readonly<{
  from: string;
  to: string;
  kilometers: number;
  paths: ReadonlyArray<ReadonlyArray<GeoPoint>>;
}>;

export type DistanceResult = Readonly<{
  places: ReadonlyArray<LocatedCity>;
  pairs: ReadonlyArray<DistancePair>;
}>;

export type GetCityPhotosInput = Readonly<{
  city: string;
  limit: number;
}>;

export type CityPhotos = Readonly<{
  city: string;
  country: string;
  photos: ReadonlyArray<CityPhoto>;
}>;

export type SearchFlightsInput = Readonly<{
  origin: string;
  destination: string;
  departureDate?: string | undefined;
  returnDate?: string | undefined;
  maxResults: number;
}>;

export type FlightOffer = WebPage &
  Readonly<{
    price: string | undefined;
  }>;

export type FlightSearch = Readonly<{
  origin: string;
  destination: string;
  departureDate: string | undefined;
  returnDate: string | undefined;
  query: string;
  dates: string;
  offers: ReadonlyArray<FlightOffer>;
}>;

export type GetForecastInput = Readonly<{
  city: string;
  countryCode?: string | undefined;
  startDate?: string | undefined;
  endDate?: string | undefined;
}>;

export type WeatherOutlook = WeatherOutlookData &
  Readonly<{
    city: string;
    country: string;
  }>;

export type Weather = Readonly<{
  city: string;
  country: string;
  temperatureCelsius: number;
  observedAt: string;
}>;
