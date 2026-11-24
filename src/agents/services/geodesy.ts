import geographiclib from "geographiclib";
import { z } from "zod";
import type { Coordinates } from "./types.js";

const inverseResultSchema = z.object({
  s12: z.number(),
  azi1: z.number(),
});

const directResultSchema = z.object({
  lat2: z.number(),
  lon2: z.number(),
});

const MIN_PATH_SEGMENTS = 16;
const MAX_PATH_SEGMENTS = 128;
const METERS_PER_SEGMENT = 100_000;

function inverse(from: Coordinates, to: Coordinates): z.output<typeof inverseResultSchema> {
  return inverseResultSchema.parse(
    geographiclib.Geodesic.WGS84.Inverse(from.latitude, from.longitude, to.latitude, to.longitude),
  );
}

export function unwrapLongitude(longitude: number, reference: number): number {
  let value = longitude;
  while (value - reference > 180) value -= 360;
  while (value - reference < -180) value += 360;
  return value;
}

export function geodesicDistanceKm(from: Coordinates, to: Coordinates): number {
  return inverse(from, to).s12 / 1000;
}

export function pathCopies(
  path: ReadonlyArray<Coordinates>,
  endLongitude: number,
): ReadonlyArray<ReadonlyArray<Coordinates>> {
  const last = path[path.length - 1];
  if (!last) return [path];
  const offset = Math.round((endLongitude - last.longitude) / 360) * 360;
  if (offset === 0) return [path];
  return [path, path.map((point) => ({ latitude: point.latitude, longitude: point.longitude + offset }))];
}

export function geodesicPath(from: Coordinates, to: Coordinates): ReadonlyArray<Coordinates> {
  const { s12, azi1 } = inverse(from, to);
  const segments = Math.min(
    MAX_PATH_SEGMENTS,
    Math.max(MIN_PATH_SEGMENTS, Math.ceil(s12 / METERS_PER_SEGMENT)),
  );

  const points: Coordinates[] = [];
  let previousLongitude = from.longitude;
  for (let index = 0; index <= segments; index++) {
    const point = directResultSchema.parse(
      geographiclib.Geodesic.WGS84.Direct(from.latitude, from.longitude, azi1, (s12 * index) / segments),
    );
    const longitude = unwrapLongitude(point.lon2, previousLongitude);
    points.push({ latitude: point.lat2, longitude });
    previousLongitude = longitude;
  }
  return points;
}
