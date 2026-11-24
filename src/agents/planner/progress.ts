import type { ProgressStep, ProgressStepStatus, ToolProgress } from "../types.js";

export type StepDefinition = Readonly<{ id: string; label: string }>;

export type ProgressTracker = Readonly<{
  start: (id: string) => void;
  done: (id: string, detail?: string) => void;
  skip: (id: string, detail: string) => void;
  fail: (id: string, detail: string) => void;
  track: <Result>(id: string, work: () => Promise<Result>, describe?: (result: Result) => string) => Promise<Result>;
}>;

export function createProgressTracker(
  title: string,
  definitions: ReadonlyArray<StepDefinition>,
  report: (progress: ToolProgress) => void,
): ProgressTracker {
  let steps: ReadonlyArray<ProgressStep> = definitions.map((step) => ({ ...step, status: "pending" }));

  const update = (id: string, status: ProgressStepStatus, detail?: string): void => {
    steps = steps.map((step) => (step.id === id ? { ...step, status, detail } : step));
    report({ title, steps });
  };

  report({ title, steps });

  return {
    start: (id) => update(id, "running"),
    done: (id, detail) => update(id, "done", detail),
    skip: (id, detail) => update(id, "skipped", detail),
    fail: (id, detail) => update(id, "failed", detail),
    track: async (id, work, describe) => {
      update(id, "running");
      try {
        const result = await work();
        update(id, "done", describe?.(result));
        return result;
      } catch (error) {
        update(id, "failed", error instanceof Error ? error.message : String(error));
        throw error;
      }
    },
  };
}
