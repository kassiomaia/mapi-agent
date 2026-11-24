import * as L from "leaflet";
import { useEffect, useRef } from "react";
import type { MapBlock, MapRoute } from "../../agents/generative-ui/types.js";

const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const FRAME_MARGIN_DEGREES = 30;

const kilometerFormat = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

type Frame = Readonly<{ west: number; east: number }>;

function textElement(text: string, className: string): HTMLElement {
  const element = document.createElement("span");
  element.className = className;
  element.textContent = text;
  return element;
}

function describe(block: MapBlock): string {
  return block.routes
    .map((route) => `${route.from} até ${route.to}: ${kilometerFormat.format(route.kilometers)} km`)
    .join("; ");
}

function frameOf(block: MapBlock): Frame {
  const longitudes = block.points.map((point) => point.longitude);
  return {
    west: Math.min(...longitudes) - FRAME_MARGIN_DEGREES,
    east: Math.max(...longitudes) + FRAME_MARGIN_DEGREES,
  };
}

function isInFrame(latLng: L.LatLng, frame: Frame): boolean {
  return latLng.lng >= frame.west && latLng.lng <= frame.east;
}

function labelPosition(paths: ReadonlyArray<ReadonlyArray<L.LatLng>>, frame: Frame): L.LatLng | undefined {
  const middles = paths
    .map((path) => path[Math.floor(path.length / 2)])
    .filter((latLng): latLng is L.LatLng => latLng !== undefined);
  return middles.find((latLng) => isInFrame(latLng, frame)) ?? middles[0];
}

function drawRoute(map: L.Map, route: MapRoute, frame: Frame, bounds: L.LatLngBounds): void {
  const paths = route.paths.map((path) => path.map((point) => L.latLng(point.latitude, point.longitude)));

  for (const latLngs of paths) {
    L.polyline(latLngs, { className: "map-route-casing", weight: 8 }).addTo(map);
    L.polyline(latLngs, { className: "map-route", weight: 4.5 }).addTo(map);
    latLngs.filter((latLng) => isInFrame(latLng, frame)).forEach((latLng) => bounds.extend(latLng));
  }

  const position = labelPosition(paths, frame);
  if (position) {
    L.tooltip({ permanent: true, direction: "center", className: "map-distance" })
      .setLatLng(position)
      .setContent(textElement(`${kilometerFormat.format(route.kilometers)} km`, "map-distance-text"))
      .addTo(map);
  }
}

export function MapView({ block }: { block: MapBlock }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const map = L.map(container, { scrollWheelZoom: false });
    L.tileLayer(TILE_URL, { maxZoom: 19, attribution: TILE_ATTRIBUTION }).addTo(map);

    const frame = frameOf(block);
    const bounds = L.latLngBounds([]);

    for (const route of block.routes) {
      drawRoute(map, route, frame, bounds);
    }

    for (const point of block.points) {
      const latLng = L.latLng(point.latitude, point.longitude);
      L.circleMarker(latLng, {
        className: "map-city-dot",
        radius: 7,
        weight: 2.5,
        fillOpacity: 1,
      })
        .bindTooltip(textElement(point.name, "map-city-text"), {
          permanent: true,
          direction: "top",
          offset: [0, -6],
          className: "map-city",
        })
        .addTo(map);
      bounds.extend(latLng);
    }

    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40] });
    } else {
      map.setView([0, 0], 2);
    }

    return () => {
      map.remove();
    };
  }, [block]);

  return (
    <div
      ref={containerRef}
      className="h-[22.5rem] w-full overflow-hidden rounded-[var(--radius-control)] border border-border"
      role="img"
      aria-label={describe(block)}
    />
  );
}
