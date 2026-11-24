import {
  CalendarRange,
  Calculator,
  CloudSun,
  Images,
  LayoutTemplate,
  MapPin,
  NotebookPen,
  Plane,
  Route,
  Wrench,
} from "lucide-react";
import type { ReactNode } from "react";
import type { AgentActivityItem } from "@/components/beui/components/agents/agent-activity/types";
import { describeToolInput } from "../lib/format.js";
import type { ActivityEntry } from "../types.js";

type ToolPresentation = Readonly<{ label: string; icon: ReactNode }>;

const toolPresentation: Readonly<Record<string, ToolPresentation>> = {
  calculate: { label: "Fez a conta", icon: <Calculator className="size-4" /> },
  get_weather: { label: "Consultou o clima", icon: <CloudSun className="size-4" /> },
  get_forecast: { label: "Consultou a previsão", icon: <CalendarRange className="size-4" /> },
  get_coordinates: { label: "Localizou a cidade", icon: <MapPin className="size-4" /> },
  calculate_distance: { label: "Mediu a rota", icon: <Route className="size-4" /> },
  get_city_photos: { label: "Buscou fotos", icon: <Images className="size-4" /> },
  search_flights: { label: "Pesquisou passagens", icon: <Plane className="size-4" /> },
  plan_trip: { label: "Montou o plano da viagem", icon: <NotebookPen className="size-4" /> },
  render_ui: { label: "Montou um resumo", icon: <LayoutTemplate className="size-4" /> },
};

function presentationOf(name: string): ToolPresentation {
  return toolPresentation[name] ?? { label: name, icon: <Wrench className="size-4" /> };
}

function firstLine(text: string): string {
  return text.split("\n")[0] ?? text;
}

export function toActivityItems(entries: ReadonlyArray<ActivityEntry>): AgentActivityItem[] {
  return entries.map((entry) => {
    if (entry.kind === "thinking") {
      return { id: entry.id, type: "text", content: entry.text };
    }

    const { label, icon } = presentationOf(entry.name);
    const detail =
      entry.output === undefined ? (
        describeToolInput(entry.name, entry.input)
      ) : entry.isError ? (
        <span className="text-destructive">{firstLine(entry.output)}</span>
      ) : (
        firstLine(entry.output)
      );

    return { id: entry.id, type: "trace", kind: "run", label, icon, detail };
  });
}
