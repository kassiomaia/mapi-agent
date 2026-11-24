import type { AgentEvent } from "../agents/types.js";
import type { ServerMessage } from "../server/types.js";
import type { ActivityEntry, NextStepChoice, ProgressEntry, Turn } from "./types.js";

export function startTurn(turns: ReadonlyArray<Turn>, id: number, prompt: string, now: number): ReadonlyArray<Turn> {
  return [
    ...turns,
    {
      id,
      prompt,
      status: "working",
      activity: [],
      progress: [],
      interfaces: [],
      answer: undefined,
      guardrail: undefined,
      error: undefined,
      stoppedByLimit: false,
      nextStep: undefined,
      nextStepChoice: "pending",
      startedAt: now,
      finishedAt: undefined,
    },
  ];
}

function updateWorkingTurn(turns: ReadonlyArray<Turn>, update: (turn: Turn) => Turn): ReadonlyArray<Turn> {
  const last = turns[turns.length - 1];
  if (!last || last.status !== "working") return turns;
  return [...turns.slice(0, -1), update(last)];
}

function completeTool(
  activity: ReadonlyArray<ActivityEntry>,
  event: Extract<AgentEvent, { type: "result" }>,
  id: string,
): ReadonlyArray<ActivityEntry> {
  const index = activity.findLastIndex(
    (entry) => entry.kind === "tool" && entry.name === event.name && entry.output === undefined,
  );
  const pending = activity[index];
  if (pending?.kind !== "tool") {
    return [
      ...activity,
      { id, kind: "tool", name: event.name, input: undefined, output: event.output, isError: event.isError },
    ];
  }
  return activity.map((entry, position) =>
    position === index ? { ...pending, output: event.output, isError: event.isError } : entry,
  );
}

function applyEvent(turn: Turn, event: AgentEvent): Turn {
  const id = `${turn.id}-${turn.activity.length}`;
  switch (event.type) {
    case "thinking":
      return { ...turn, activity: [...turn.activity, { id, kind: "thinking", text: event.text }] };
    case "tool":
      return {
        ...turn,
        activity: [
          ...turn.activity,
          { id, kind: "tool", name: event.name, input: event.input, output: undefined, isError: false },
        ],
      };
    case "result":
      return { ...turn, activity: completeTool(turn.activity, event, id) };
    case "guardrail":
      return { ...turn, guardrail: event.reason };
    case "ui":
      return { ...turn, interfaces: [...turn.interfaces, event.spec] };
    case "progress":
      return { ...turn, progress: upsertProgress(turn.progress, event) };
  }
}

function upsertProgress(
  entries: ReadonlyArray<ProgressEntry>,
  event: Extract<AgentEvent, { type: "progress" }>,
): ReadonlyArray<ProgressEntry> {
  const entry: ProgressEntry = { toolUseId: event.toolUseId, name: event.name, progress: event.progress };
  return entries.some((existing) => existing.toolUseId === event.toolUseId)
    ? entries.map((existing) => (existing.toolUseId === event.toolUseId ? entry : existing))
    : [...entries, entry];
}

export function chooseNextStep(
  turns: ReadonlyArray<Turn>,
  turnId: number,
  choice: NextStepChoice,
): ReadonlyArray<Turn> {
  return turns.map((turn) => (turn.id === turnId ? { ...turn, nextStepChoice: choice } : turn));
}

export function applyServerMessage(
  turns: ReadonlyArray<Turn>,
  message: ServerMessage,
  now: number,
): ReadonlyArray<Turn> {
  switch (message.type) {
    case "ready":
      return turns;
    case "event":
      return updateWorkingTurn(turns, (turn) => applyEvent(turn, message.event));
    case "answer":
      return updateWorkingTurn(turns, (turn) => ({
        ...turn,
        status: "complete",
        answer: message.text.trim() === "" ? undefined : message.text,
        stoppedByLimit: message.stoppedByLimit,
        nextStep: message.nextStep ?? undefined,
        finishedAt: now,
      }));
    case "cancelled":
      return updateWorkingTurn(turns, (turn) => ({ ...turn, status: "cancelled", finishedAt: now }));
    case "error":
      return updateWorkingTurn(turns, (turn) => ({
        ...turn,
        status: "failed",
        error: message.message,
        finishedAt: now,
      }));
  }
}
