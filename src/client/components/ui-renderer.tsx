import {
  Accordion,
  AccordionHeader,
  AccordionItem,
  AccordionPanel,
  AccordionTrigger,
} from "@ui-sdk/react/accordion";
import { Meter, MeterIndicator, MeterLabel, MeterTrack, MeterValue } from "@ui-sdk/react/meter";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@ui-sdk/react/tabs";
import { ChevronDown } from "lucide-react";
import type { UiBlock, UiLeafBlock, UiSpec } from "../../agents/generative-ui/types.js";
import { GalleryView } from "./gallery-view.js";
import { TripDetailsForm } from "./forms/trip-details-form.js";
import { MapView } from "./map-view.js";
import { TripPlanView } from "./trip-plan/trip-plan-view.js";
import { WeatherOutlookView } from "./weather-outlook-view.js";
import { WebResultsView } from "./web-results-view.js";
import { CodeRunView } from "./code-run-view.js";

type MeterBlock = Extract<UiLeafBlock, { type: "meter" }>;
type TabsBlock = Extract<UiBlock, { type: "tabs" }>;
type AccordionBlock = Extract<UiBlock, { type: "accordion" }>;

function MeterView({ block }: { block: MeterBlock }) {
  const unit = block.unit;
  return (
    <Meter
      className="flex flex-col gap-1.5"
      value={block.value}
      min={block.min}
      max={block.max}
      format={unit ? (value: number) => `${value} ${unit}` : { style: "decimal" }}
    >
      <div className="flex items-baseline justify-between gap-4 text-sm">
        <MeterLabel className="text-muted-foreground">{block.label}</MeterLabel>
        <MeterValue className="font-medium tabular-nums" />
      </div>
      <MeterTrack className="h-1.5 overflow-hidden rounded-full bg-muted">
        <MeterIndicator className="h-full rounded-full bg-foreground" />
      </MeterTrack>
    </Meter>
  );
}

function LeafBlockView({ block }: { block: UiLeafBlock }) {
  switch (block.type) {
    case "text":
      return <p className="max-w-[68ch] text-sm leading-6 text-foreground">{block.text}</p>;
    case "stats":
      return (
        <dl className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
          {block.items.map((item, index) => (
            <div key={index} className="flex flex-col gap-0.5 rounded-[var(--radius-control)] bg-muted px-3 py-2.5">
              <dt className="text-xs text-muted-foreground">{item.label}</dt>
              <dd className="text-base font-semibold tabular-nums text-foreground">{item.value}</dd>
              {item.hint ? <dd className="text-xs text-muted-foreground">{item.hint}</dd> : null}
            </div>
          ))}
        </dl>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-[var(--radius-control)] border border-border">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr>
                {block.columns.map((column, index) => (
                  <th
                    key={index}
                    scope="col"
                    className="bg-muted/60 px-3 py-2 text-left text-xs font-medium text-muted-foreground"
                  >
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, cellIndex) => (
                    <td key={cellIndex} className="border-t border-border px-3 py-2 tabular-nums">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm leading-6 marker:text-muted-foreground">
          {block.items.map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    case "meter":
      return <MeterView block={block} />;
  }
}

function TabsView({ block }: { block: TabsBlock }) {
  return (
    <Tabs className="flex flex-col gap-3" defaultValue="tab-0">
      <TabsList className="inline-flex w-fit gap-1 rounded-[var(--radius-control)] bg-muted p-1" aria-label={block.label}>
        {block.tabs.map((tab, index) => (
          <TabsTab
            key={index}
            value={`tab-${index}`}
            className="rounded-md px-3 py-1 text-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[selected]:bg-card data-[selected]:text-foreground data-[selected]:shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
          >
            {tab.label}
          </TabsTab>
        ))}
      </TabsList>
      {block.tabs.map((tab, index) => (
        <TabsPanel key={index} value={`tab-${index}`} className="flex flex-col gap-3">
          {tab.blocks.map((child, childIndex) => (
            <LeafBlockView key={childIndex} block={child} />
          ))}
        </TabsPanel>
      ))}
    </Tabs>
  );
}

function AccordionView({ block }: { block: AccordionBlock }) {
  return (
    <Accordion className="flex flex-col" defaultValue={["item-0"]}>
      {block.items.map((item, index) => (
        <AccordionItem key={index} value={`item-${index}`} className="group border-b border-border last:border-b-0">
          <AccordionHeader>
            <AccordionTrigger className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {item.title}
              <ChevronDown
                aria-hidden="true"
                className="size-4 shrink-0 text-muted-foreground transition-transform group-data-[open]:rotate-180"
              />
            </AccordionTrigger>
          </AccordionHeader>
          <AccordionPanel className="flex flex-col gap-3 pb-3">
            {item.blocks.map((child, childIndex) => (
              <LeafBlockView key={childIndex} block={child} />
            ))}
          </AccordionPanel>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

function BlockView({ block }: { block: UiBlock }) {
  switch (block.type) {
    case "tabs":
      return <TabsView block={block} />;
    case "accordion":
      return <AccordionView block={block} />;
    case "map":
      return <MapView block={block} />;
    case "gallery":
      return <GalleryView block={block} />;
    case "web_results":
      return <WebResultsView block={block} />;
    case "trip_plan":
      return <TripPlanView block={block} />;
    case "trip_details_form":
      return <TripDetailsForm block={block} />;
    case "weather_outlook":
      return <WeatherOutlookView block={block} />;
    case "code_run":
      return <CodeRunView block={block} />;
    default:
      return <LeafBlockView block={block} />;
  }
}

export function UiRenderer({ spec }: { spec: UiSpec }) {
  const [onlyBlock] = spec.blocks;
  if (spec.blocks.length === 1 && onlyBlock?.type === "trip_plan") {
    return <TripPlanView block={onlyBlock} />;
  }
  if (spec.blocks.length === 1 && onlyBlock?.type === "trip_details_form") {
    return <TripDetailsForm block={onlyBlock} />;
  }
  return (
    <section
      className="generated-result flex w-full flex-col gap-4 rounded-[var(--radius-card)] border-[1.5px] border-border bg-card p-4"
      aria-label={spec.title ?? "Detalhes da viagem"}
    >
      {spec.title ? (
        <h3 className="font-display text-lg leading-6 font-semibold text-balance text-ink">{spec.title}</h3>
      ) : null}
      {spec.blocks.map((block, index) => (
        <BlockView key={index} block={block} />
      ))}
    </section>
  );
}
