import { geodesicDistanceKm } from "../services/geodesy.js";
import { fetchForecast, geocodeCity, MAX_FORECAST_DAYS } from "../services/open-meteo.js";
import { searchWeb } from "../services/tavily.js";
import type { Forecast, Place, WeatherOutlookData } from "../services/types.js";
import { addDays, fetchWeatherOutlook, MAX_OUTLOOK_DAYS, todayIso } from "../services/weather-outlook.js";
import { fetchCityPhotos } from "../services/wikimedia.js";
import { searchFlights } from "../tools/search_flights.js";
import { cheapestPrice } from "./price.js";
import type { ProgressTracker, StepDefinition } from "./progress.js";
import { describeTimeDifference } from "./time-difference.js";
import type {
  FlightSummary,
  PlanPlace,
  PlanTripInput,
  ResearchNotes,
  ResearchTopic,
  ResearchTopicId,
  TripResearch,
} from "./types.js";

const PHOTO_COUNT = 8;
const UPCOMING_DAYS = 7;
const PAGES_PER_TOPIC = 5;
const DEFAULT_DAYS = 4;
const MIN_DAYS = 2;
const MAX_DAYS = 7;
const MS_PER_DAY = 86_400_000;

const monthFormat = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });

export const COMPOSE_STEP: StepDefinition = { id: "compose", label: "Montar o roteiro" };
export const ITEM_PHOTOS_STEP: StepDefinition = { id: "item_photos", label: "Buscar fotos do roteiro, atrações, pratos e bairros" };

const TOPIC_LABELS: Readonly<Record<ResearchTopicId, string>> = {
  attractions: "Pesquisar o que ver",
  food: "Pesquisar o que comer",
  stay: "Pesquisar onde ficar",
  tips: "Pesquisar dicas práticas",
  events: "Pesquisar eventos no período",
  budget: "Estimar o orçamento",
};

function topicQueries(input: PlanTripInput, place: PlanPlace): Readonly<Record<ResearchTopicId, string>> {
  const where = `${place.city}, ${place.country}`;
  const interests = input.interests?.length ? ` para quem gosta de ${input.interests.join(", ")}` : "";
  const period = input.departureDate
    ? `em ${monthFormat.format(new Date(`${input.departureDate}T00:00:00Z`))}`
    : "nos próximos meses";
  return {
    attractions: `principais pontos turísticos e o que fazer em ${where}${interests}`,
    food: `comidas típicas e onde comer em ${where}`,
    stay: `melhores bairros para se hospedar em ${where} para turistas`,
    tips: `dicas de viagem para ${where}: transporte, segurança, moeda, gorjeta`,
    events: `eventos, festas e feriados em ${where} ${period}`,
    budget: `quanto custa viajar para ${where}: gastos por dia de um turista`,
  };
}

function researchTopics(input: PlanTripInput, place: PlanPlace): ReadonlyArray<ResearchTopic> {
  const queries = topicQueries(input, place);
  return (Object.keys(TOPIC_LABELS) as ResearchTopicId[]).map((id) => ({
    id,
    label: TOPIC_LABELS[id],
    query: queries[id],
  }));
}

export const PLAN_STEPS: ReadonlyArray<StepDefinition> = [
  { id: "locate", label: "Localizar o destino" },
  { id: "weather", label: "Ver o clima e a previsão" },
  { id: "photos", label: "Buscar fotos do destino" },
  { id: "flights", label: "Pesquisar passagens" },
  { id: "distance", label: "Medir a distância da viagem" },
  ...(Object.entries(TOPIC_LABELS) as Array<[ResearchTopicId, string]>).map(([id, label]) => ({ id, label })),
  COMPOSE_STEP,
  ITEM_PHOTOS_STEP,
];

type WeatherResearch = Readonly<{ forecast: Forecast; outlook: WeatherOutlookData | undefined }>;

function tripPeriod(input: PlanTripInput): Readonly<{ start: string; end: string }> | undefined {
  const start = input.departureDate;
  if (!start || start < todayIso()) return undefined;
  const requestedEnd = input.returnDate ?? addDays(start, tripDays(input) - 1);
  const lastAllowed = addDays(start, MAX_OUTLOOK_DAYS - 1);
  return { start, end: requestedEnd > lastAllowed ? lastAllowed : requestedEnd };
}

function tripDays(input: PlanTripInput): number {
  if (!input.departureDate || !input.returnDate) return DEFAULT_DAYS;
  const nights = Math.round(
    (Date.parse(`${input.returnDate}T00:00:00Z`) - Date.parse(`${input.departureDate}T00:00:00Z`)) / MS_PER_DAY,
  );
  return Math.min(MAX_DAYS, Math.max(MIN_DAYS, nights + 1));
}

function toPlanPlace(place: Place): PlanPlace {
  return { city: place.name, country: place.country, latitude: place.latitude, longitude: place.longitude };
}

async function attempt<Result>(
  tracker: ProgressTracker,
  id: string,
  work: () => Promise<Result>,
  describe?: (result: Result) => string,
): Promise<Result | undefined> {
  try {
    return await tracker.track(id, work, describe);
  } catch {
    return undefined;
  }
}

async function locateOrigin(origin: string | undefined): Promise<Place | undefined> {
  if (!origin) return undefined;
  try {
    return await geocodeCity(origin);
  } catch {
    return undefined;
  }
}

export async function researchTrip(
  input: PlanTripInput,
  tracker: ProgressTracker,
  signal: AbortSignal | undefined,
): Promise<TripResearch> {
  const [destinationPlace, originPlace] = await tracker.track(
    "locate",
    async () => {
      const [destination, origin] = await Promise.all([geocodeCity(input.destination), locateOrigin(input.origin)]);
      if (!destination) throw new Error(`City not found: ${input.destination}`);
      return [destination, origin] as const;
    },
    ([destination]) => `${destination.name}, ${destination.country}`,
  );
  signal?.throwIfAborted();

  const destination = toPlanPlace(destinationPlace);
  const origin = originPlace ? toPlanPlace(originPlace) : undefined;
  const missingOrigin = input.origin ? `não encontrei ${input.origin}` : "sem cidade de origem";

  const period = tripPeriod(input);
  const weatherTask = attempt(
    tracker,
    "weather",
    async (): Promise<WeatherResearch> => {
      const forecast = await fetchForecast(destination.latitude, destination.longitude, MAX_FORECAST_DAYS);
      const outlook = period
        ? await fetchWeatherOutlook(destination.latitude, destination.longitude, period.start, period.end, forecast)
        : undefined;
      return { forecast: { ...forecast, days: forecast.days.slice(0, UPCOMING_DAYS) }, outlook };
    },
    ({ forecast, outlook }) =>
      !outlook
        ? `${Math.round(forecast.currentCelsius)} °C agora`
        : outlook.forecastDays.length > 0
          ? "previsão para as datas"
          : "média histórica das datas",
  );
  const photosTask = attempt(
    tracker,
    "photos",
    () => fetchCityPhotos(destinationPlace.geonamesIds, PHOTO_COUNT),
    (photos) => `${photos.length} fotos`,
  );

  const flightsTask: Promise<FlightSummary | undefined> = origin
    ? attempt(
        tracker,
        "flights",
        async () => {
          const search = await searchFlights(
            {
              origin: origin.city,
              destination: destination.city,
              departureDate: input.departureDate,
              returnDate: input.returnDate,
              maxResults: 5,
            },
            signal,
          );
          return {
            query: search.query,
            cheapest: cheapestPrice(search.offers.map((offer) => offer.price)),
            offers: search.offers.map(({ title, url, site, price }) => ({ title, url, site, price })),
          };
        },
        (flights) => `${flights.offers.length} comparadores`,
      )
    : Promise.resolve(undefined);
  if (!origin) tracker.skip("flights", missingOrigin);

  let distanceKm: number | undefined;
  if (origin) {
    distanceKm = geodesicDistanceKm(origin, destination);
    tracker.done("distance", `${Math.round(distanceKm).toLocaleString("pt-BR")} km`);
  } else {
    tracker.skip("distance", missingOrigin);
  }

  const notesTasks = researchTopics(input, destination).map((topic) =>
    attempt(
      tracker,
      topic.id,
      async (): Promise<ResearchNotes> => ({
        topic,
        pages: await searchWeb(topic.query, { maxResults: PAGES_PER_TOPIC, signal }),
      }),
      (notes) => `${notes.pages.length} páginas`,
    ),
  );

  const [weather, photos, flights, ...notes] = await Promise.all([
    weatherTask,
    photosTask,
    flightsTask,
    ...notesTasks,
  ]);
  signal?.throwIfAborted();
  const forecast = weather?.forecast;

  return {
    input,
    destination,
    origin,
    distanceKm,
    forecast,
    outlook: weather?.outlook,
    photos: photos ?? [],
    flights,
    notes: notes.filter((note): note is ResearchNotes => note !== undefined),
    days: tripDays(input),
    timeDifference: forecast
      ? describeTimeDifference(
          forecast.timezone,
          input.departureDate ? new Date(`${input.departureDate}T12:00:00Z`) : new Date(),
        )
      : undefined,
  };
}
