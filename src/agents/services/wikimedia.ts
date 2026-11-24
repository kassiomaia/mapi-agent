import { z } from "zod";
import type { CityPhoto } from "./types.js";

const CLIENT_NAME = "a5-presentation-agent-demo-bot/1.0";
const THUMBNAIL_WIDTH = 960;
const MIN_ORIGINAL_WIDTH = 800;
const DESCRIPTION_MAX_LENGTH = 180;
const MAX_PHOTOS = 8;
const PREFERRED_WIKIS = ["pt", "en"] as const;
const ARTICLE_PHOTO_PATTERN = /\.jpe?g$/i;
const BITMAP_PATTERN = /\.(jpe?g|png|webp)$/i;
const FILE_PATH_PREFIX = "Special:FilePath/";
const BOILERPLATE_DESCRIPTION = /^this is a photo of a (monument|natural heritage)/i;

const sparqlBindingSchema = z.object({ value: z.string() }).optional();

const sparqlResponseSchema = z.object({
  results: z.object({
    bindings: z.array(
      z.object({
        image: sparqlBindingSchema,
        ptTitle: sparqlBindingSchema,
        enTitle: sparqlBindingSchema,
      }),
    ),
  }),
});

const parseResponseSchema = z.object({
  parse: z.object({ images: z.array(z.string()) }).optional(),
});

const metadataValueSchema = z.object({ value: z.unknown() }).optional();

const imageInfoResponseSchema = z.object({
  query: z
    .object({
      normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      pages: z.array(
        z.object({
          title: z.string(),
          missing: z.boolean().optional(),
          imageinfo: z
            .array(
              z.object({
                thumburl: z.string().optional(),
                thumbwidth: z.number().optional(),
                thumbheight: z.number().optional(),
                width: z.number(),
                descriptionurl: z.string(),
                mime: z.string(),
                extmetadata: z
                  .object({
                    Artist: metadataValueSchema,
                    LicenseShortName: metadataValueSchema,
                    ImageDescription: metadataValueSchema,
                    ObjectName: metadataValueSchema,
                  })
                  .optional(),
              }),
            )
            .optional(),
        }),
      ),
    })
    .optional(),
});

type ImagePage = NonNullable<z.output<typeof imageInfoResponseSchema>["query"]>["pages"][number];

type CityEntry = Readonly<{
  mainImage: string | undefined;
  article: Readonly<{ wiki: string; title: string }> | undefined;
}>;

const photoCache = new Map<string, Promise<ReadonlyArray<CityPhoto>>>();

function userAgent(): string {
  const contact = process.env.WIKIMEDIA_CONTACT?.trim();
  return contact ? `${CLIENT_NAME} (${contact})` : CLIENT_NAME;
}

async function fetchWikimedia<Schema extends z.ZodType>(
  url: URL,
  schema: Schema,
): Promise<z.output<Schema>> {
  const response = await fetch(url, {
    headers: { "User-Agent": userAgent(), Accept: "application/json" },
    signal: AbortSignal.timeout(20_000),
  });
  if (response.status === 429) {
    const retryAfter = response.headers.get("retry-after") ?? "60";
    throw new Error(
      `Wikimedia rate limit reached; try again in ${retryAfter} seconds. Set WIKIMEDIA_CONTACT to raise the limit.`,
    );
  }
  if (!response.ok) {
    throw new Error(`Wikimedia API responded with HTTP ${response.status}`);
  }
  const body: unknown = await response.json();
  return schema.parse(body);
}

function apiUrl(host: string, params: Readonly<Record<string, string>>): URL {
  const url = new URL(`https://${host}/w/api.php`);
  for (const [key, value] of Object.entries({ ...params, format: "json", formatversion: "2" })) {
    url.searchParams.set(key, value);
  }
  return url;
}

function normalizeFileName(name: string): string {
  return name.replace(/^(File|Ficheiro|Arquivo):/i, "").replaceAll("_", " ").trim();
}

function plainText(value: unknown): string {
  if (typeof value !== "string") return "";
  return value
    .replace(/<[^>]*>/g, " ")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&amp;", "&")
    .replace(/\s+/g, " ")
    .trim();
}

function truncate(text: string, maxLength: number): string {
  return text.length <= maxLength ? text : `${text.slice(0, maxLength - 1).trimEnd()}…`;
}

function cityEntryQuery(geonamesIds: ReadonlyArray<number>): string {
  const candidates = geonamesIds.map((id, rank) => `("${id}" ${rank})`).join(" ");
  const articles = PREFERRED_WIKIS.map(
    (wiki) =>
      `OPTIONAL { ?${wiki} schema:about ?item; schema:isPartOf <https://${wiki}.wikipedia.org/>; schema:name ?${wiki}Title. }`,
  ).join("\n");
  return `SELECT ?image ?ptTitle ?enTitle WHERE {
VALUES (?geonamesId ?rank) { ${candidates} }
?item wdt:P1566 ?geonamesId.
OPTIONAL { ?item wdt:P18 ?image. }
${articles}
BIND(BOUND(?ptTitle) || BOUND(?enTitle) AS ?hasArticle)
}
ORDER BY DESC(?hasArticle) ?rank DESC(BOUND(?ptTitle)) DESC(BOUND(?image))
LIMIT 1`;
}

function fileNameFromUrl(url: string | undefined): string | undefined {
  if (!url) return undefined;
  const index = url.indexOf(FILE_PATH_PREFIX);
  return index === -1 ? undefined : decodeURIComponent(url.slice(index + FILE_PATH_PREFIX.length));
}

async function fetchCityEntry(geonamesIds: ReadonlyArray<number>): Promise<CityEntry | undefined> {
  const url = new URL("https://query.wikidata.org/sparql");
  url.searchParams.set("query", cityEntryQuery(geonamesIds));
  url.searchParams.set("format", "json");
  const response = await fetchWikimedia(url, sparqlResponseSchema);
  const binding = response.results.bindings[0];
  if (!binding) return undefined;

  const titles = { pt: binding.ptTitle?.value, en: binding.enTitle?.value };
  const wiki = PREFERRED_WIKIS.find((candidate) => titles[candidate] !== undefined);
  const title = wiki ? titles[wiki] : undefined;
  return {
    mainImage: fileNameFromUrl(binding.image?.value),
    article: wiki && title ? { wiki, title } : undefined,
  };
}

async function fetchArticlePhotos(wiki: string, title: string): Promise<ReadonlyArray<string>> {
  const response = await fetchWikimedia(
    apiUrl(`${wiki}.wikipedia.org`, { action: "parse", page: title, prop: "images", redirects: "1" }),
    parseResponseSchema,
  );
  return (response.parse?.images ?? []).filter((name) => ARTICLE_PHOTO_PATTERN.test(name));
}

type PhotoOptions = Readonly<{ thumbnailWidth: number; minOriginalWidth: number }>;

const CITY_PHOTO_OPTIONS: PhotoOptions = { thumbnailWidth: THUMBNAIL_WIDTH, minOriginalWidth: MIN_ORIGINAL_WIDTH };
const ARTICLE_PHOTO_OPTIONS: PhotoOptions = { thumbnailWidth: 640, minOriginalWidth: 320 };
const MAX_TITLE_SEARCHES = 5;

function toCityPhoto(file: string, page: ImagePage | undefined, options: PhotoOptions): CityPhoto | undefined {
  const info = page?.imageinfo?.[0];
  if (!info?.thumburl || !info.thumbwidth || !info.thumbheight) return undefined;
  if (!info.mime.startsWith("image/") || info.mime === "image/svg+xml") return undefined;
  if (info.width < options.minOriginalWidth) return undefined;

  const metadata = info.extmetadata;
  const imageDescription = plainText(metadata?.ImageDescription?.value);
  const usefulDescription = BOILERPLATE_DESCRIPTION.test(imageDescription) ? "" : imageDescription;
  const description = usefulDescription || plainText(metadata?.ObjectName?.value) || file;
  return {
    file,
    description: truncate(description, DESCRIPTION_MAX_LENGTH),
    imageUrl: info.thumburl,
    width: info.thumbwidth,
    height: info.thumbheight,
    pageUrl: info.descriptionurl,
    author: truncate(plainText(metadata?.Artist?.value) || "autor não informado", 80),
    license: plainText(metadata?.LicenseShortName?.value) || "licença não informada",
  };
}

async function fetchPhotoDetails(
  files: ReadonlyArray<string>,
  options: PhotoOptions = CITY_PHOTO_OPTIONS,
): Promise<ReadonlyArray<CityPhoto>> {
  if (files.length === 0) return [];
  const response = await fetchWikimedia(
    apiUrl("commons.wikimedia.org", {
      action: "query",
      titles: files.map((file) => `File:${file}`).join("|"),
      prop: "imageinfo",
      iiprop: "url|mime|size|extmetadata",
      iiurlwidth: String(options.thumbnailWidth),
      iiextmetadatafilter: "Artist|LicenseShortName|ImageDescription|ObjectName",
    }),
    imageInfoResponseSchema,
  );
  const pages = new Map(
    (response.query?.pages ?? [])
      .filter((page) => !page.missing)
      .map((page) => [normalizeFileName(page.title), page] as const),
  );
  return files.flatMap((file) => toCityPhoto(file, pages.get(file), options) ?? []);
}

const leadImageResponseSchema = z.object({
  query: z
    .object({
      normalized: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      redirects: z.array(z.object({ from: z.string(), to: z.string() })).optional(),
      pages: z.array(z.object({ title: z.string(), pageimage: z.string().optional() })),
    })
    .optional(),
});

async function fetchLeadImages(titles: ReadonlyArray<string>): Promise<ReadonlyMap<string, string>> {
  const response = await fetchWikimedia(
    apiUrl("en.wikipedia.org", {
      action: "query",
      titles: titles.join("|"),
      prop: "pageimages",
      piprop: "name",
      redirects: "1",
    }),
    leadImageResponseSchema,
  );
  const query = response.query;
  const rename = new Map([...(query?.normalized ?? []), ...(query?.redirects ?? [])].map(({ from, to }) => [from, to]));
  const images = new Map((query?.pages ?? []).flatMap((page) => (page.pageimage ? [[page.title, page.pageimage] as const] : [])));
  const resolve = (title: string): string => {
    let current = title;
    for (let hops = 0; hops < 3 && rename.has(current); hops++) current = rename.get(current) ?? current;
    return current;
  };
  return new Map(titles.flatMap((title) => {
    const image = images.get(resolve(title));
    return image ? [[title, image] as const] : [];
  }));
}

const searchImageResponseSchema = z.object({
  query: z.object({ pages: z.array(z.object({ pageimage: z.string().optional() })) }).optional(),
});

async function searchLeadImage(query: string): Promise<string | undefined> {
  const response = await fetchWikimedia(
    apiUrl("en.wikipedia.org", {
      action: "query",
      generator: "search",
      gsrsearch: query,
      gsrlimit: "1",
      prop: "pageimages",
      piprop: "name",
    }),
    searchImageResponseSchema,
  );
  return response.query?.pages[0]?.pageimage;
}

export async function fetchWikipediaPhotos(titles: ReadonlyArray<string>): Promise<ReadonlyMap<string, CityPhoto>> {
  const unique = [...new Set(titles.map((title) => title.trim()).filter((title) => title !== ""))];
  if (unique.length === 0) return new Map();

  const files = new Map(await fetchLeadImages(unique));
  const missing = unique.filter((title) => !files.has(title)).slice(0, MAX_TITLE_SEARCHES);
  const found = await Promise.all(missing.map(async (title) => [title, await searchLeadImage(title)] as const));
  for (const [title, file] of found) if (file) files.set(title, file);

  const fileNames = [...new Set([...files.values()].map(normalizeFileName))];
  const photos = await fetchPhotoDetails(fileNames, ARTICLE_PHOTO_OPTIONS);
  const byFile = new Map(photos.map((photo) => [photo.file, photo]));
  return new Map(
    [...files.entries()].flatMap(([title, file]) => {
      const photo = byFile.get(normalizeFileName(file));
      return photo ? [[title, photo] as const] : [];
    }),
  );
}

async function loadCityPhotos(geonamesIds: ReadonlyArray<number>): Promise<ReadonlyArray<CityPhoto>> {
  const entry = await fetchCityEntry(geonamesIds);
  if (!entry) return [];

  const articlePhotos = entry.article ? await fetchArticlePhotos(entry.article.wiki, entry.article.title) : [];
  const mainImage = entry.mainImage && BITMAP_PATTERN.test(entry.mainImage) ? [entry.mainImage] : [];
  const candidates = [...new Set([...mainImage, ...articlePhotos].map(normalizeFileName))].slice(
    0,
    MAX_PHOTOS * 2,
  );

  const photos = await fetchPhotoDetails(candidates);
  return photos.slice(0, MAX_PHOTOS);
}

export async function fetchCityPhotos(
  geonamesIds: ReadonlyArray<number>,
  limit: number,
): Promise<ReadonlyArray<CityPhoto>> {
  const key = geonamesIds.join(",");
  if (key === "") return [];
  let photos = photoCache.get(key);
  if (!photos) {
    photos = loadCityPhotos(geonamesIds);
    photoCache.set(key, photos);
    photos.catch(() => photoCache.delete(key));
  }
  return (await photos).slice(0, limit);
}
