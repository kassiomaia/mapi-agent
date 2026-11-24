import type Anthropic from "@anthropic-ai/sdk";
import { calculateDistanceTool } from "./calculate_distance.js";
import { calculateTool } from "./calculate.js";
import { getCityPhotosTool } from "./get_city_photos.js";
import { getCoordinatesTool } from "./get_coordinates.js";
import { getForecastTool } from "./get_forecast.js";
import { getWeatherTool } from "./get_weather.js";
import { planTripTool } from "./plan_trip.js";
import { runJavascriptTool } from "./run_javascript.js";
import { searchFlightsTool } from "./search_flights.js";
import type { RegisteredTool, ToolContext, ToolExecution } from "./types.js";

const registeredTools: ReadonlyArray<RegisteredTool> = [
  calculateTool,
  getWeatherTool,
  getForecastTool,
  getCoordinatesTool,
  calculateDistanceTool,
  getCityPhotosTool,
  searchFlightsTool,
  planTripTool,
  runJavascriptTool,
];

export const tools: Anthropic.Tool[] = registeredTools.map((tool) => tool.definition);

export async function runTool(name: string, input: unknown, context: ToolContext): Promise<ToolExecution> {
  const tool = registeredTools.find((registered) => registered.definition.name === name);
  if (!tool) {
    throw new Error(`Unknown tool: ${name}`);
  }
  return tool.execute(input, context);
}
