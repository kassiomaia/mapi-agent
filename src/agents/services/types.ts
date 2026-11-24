export type Place = Readonly<{
  name: string;
  country: string;
  latitude: number;
  longitude: number;
  geonamesIds: ReadonlyArray<number>;
}>;

export type DailyForecast = Readonly<{
  date: string;
  maxCelsius: number;
  minCelsius: number;
  rainChance: number | undefined;
  weatherCode: number;
}>;

export type Forecast = Readonly<{
  currentCelsius: number;
  observedAt: string;
  timezone: string;
  days: ReadonlyArray<DailyForecast>;
}>;

export type ClimateDay = Readonly<{
  monthDay: string;
  averageMaxCelsius: number;
  averageMinCelsius: number;
  rainyShare: number;
}>;

export type ClimateNormals = Readonly<{
  fromYear: number;
  toYear: number;
  days: ReadonlyArray<ClimateDay>;
  averageMaxCelsius: number;
  averageMinCelsius: number;
  rainyShare: number;
  averagePrecipitationMm: number;
}>;

export type WeatherOutlookData = Readonly<{
  startDate: string;
  endDate: string;
  forecastDays: ReadonlyArray<DailyForecast>;
  climateStartDate: string | undefined;
  climateEndDate: string | undefined;
  climate: ClimateNormals | undefined;
}>;

export type WebPage = Readonly<{
  title: string;
  url: string;
  site: string;
  content: string;
}>;

export type CityPhoto = Readonly<{
  file: string;
  description: string;
  imageUrl: string;
  width: number;
  height: number;
  pageUrl: string;
  author: string;
  license: string;
}>;

export type Coordinates = Readonly<{
  latitude: number;
  longitude: number;
}>;
