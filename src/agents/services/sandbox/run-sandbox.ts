import { Worker } from "node:worker_threads";
import { SANDBOX_TIME_LIMIT_MS } from "./run-quickjs.js";
import type { SandboxErrorKind, SandboxRequest, SandboxRun } from "./types.js";

const HARD_DEADLINE_MS = SANDBOX_TIME_LIMIT_MS + 1000;
const WORKER_URL = new URL(`./worker${import.meta.url.endsWith(".ts") ? ".ts" : ".js"}`, import.meta.url);

// Each run gets its own worker thread. QuickJS can abort the whole WebAssembly module after
// running out of memory, so a crash must only take down the worker, never the server.
// The hard deadline also covers work that the QuickJS interrupt handler cannot stop in time.
export function runInSandbox(request: SandboxRequest): Promise<SandboxRun> {
  const started = Date.now();
  return new Promise((resolve) => {
    const worker = new Worker(WORKER_URL, {
      workerData: request,
      resourceLimits: { maxOldGenerationSizeMb: 64, maxYoungGenerationSizeMb: 16 },
    });
    let settled = false;

    const finish = (run: SandboxRun): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      void worker.terminate();
      resolve(run);
    };
    const fail = (kind: SandboxErrorKind, message: string): void =>
      finish({ ok: false, error: { kind, message }, logs: [], durationMs: Date.now() - started });

    const timer = setTimeout(
      () => fail("timeout", `A execução passou de ${HARD_DEADLINE_MS / 1000} s e foi interrompida`),
      HARD_DEADLINE_MS,
    );
    worker.once("message", (run: SandboxRun) => finish(run));
    worker.once("error", (error) => {
      const text = error instanceof Error ? error.message : String(error);
      if (/out of memory|gc_obj_list|Aborted/i.test(text)) fail("memory", "A execução passou do limite de memória");
      else fail("crash", text.slice(0, 200));
    });
    worker.once("exit", (code) => fail("crash", `A sandbox encerrou com código ${code}`));
  });
}
