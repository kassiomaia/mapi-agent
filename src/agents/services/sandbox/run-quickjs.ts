import { getQuickJS, shouldInterruptAfterDeadline, type QuickJSContext, type QuickJSHandle } from "quickjs-emscripten";
import { HELPERS_SOURCE } from "./helpers-source.js";
import type { SandboxError, SandboxErrorKind, SandboxRequest, SandboxRun } from "./types.js";

export const SANDBOX_TIME_LIMIT_MS = 2000;
const MEMORY_LIMIT_BYTES = 32 * 1024 * 1024;
const STACK_LIMIT_BYTES = 1024 * 1024;
const RESULT_LIMIT_CHARS = 4000;
const LOG_LIMIT = 50;
const LOG_LINE_LIMIT = 300;
const CODE_FILE_NAME = "agent-code.js";
const WRAPPER_LINES = 1;

function frozenGlobal(name: string, value: unknown): string {
  return (
    `globalThis.${name} = (function freeze(o) {` +
    ` if (o && typeof o === "object") { Object.values(o).forEach(freeze); Object.freeze(o); } return o;` +
    ` })(${JSON.stringify(value ?? null)});`
  );
}

function installConsole(vm: QuickJSContext, logs: string[]): void {
  const consoleObject = vm.newObject();
  const log = vm.newFunction("log", (...args: QuickJSHandle[]) => {
    if (logs.length >= LOG_LIMIT) return;
    const line = args.map((arg) => {
      const value: unknown = vm.dump(arg);
      return typeof value === "string" ? value : JSON.stringify(value);
    });
    logs.push(line.join(" ").slice(0, LOG_LINE_LIMIT));
  });
  vm.setProp(consoleObject, "log", log);
  vm.setProp(vm.global, "console", consoleObject);
  log.dispose();
  consoleObject.dispose();
}

function classify(raw: unknown): SandboxError {
  const record = typeof raw === "object" && raw !== null ? (raw as Record<string, unknown>) : {};
  const name = typeof record.name === "string" ? record.name : "Error";
  const message = typeof record.message === "string" ? record.message : String(raw);
  const stack = typeof record.stack === "string" ? record.stack : "";
  const lineMatch = stack.match(new RegExp(`${CODE_FILE_NAME.replace(".", "\\.")}:(\\d+)`));
  const line = lineMatch ? Number(lineMatch[1]) - WRAPPER_LINES : undefined;
  const kind: SandboxErrorKind = /out of memory/i.test(message)
    ? "memory"
    : /interrupted/i.test(message)
      ? "timeout"
      : name === "SyntaxError"
        ? "syntax"
        : "runtime";
  return { kind, message: `${name}: ${message}`, ...(line && line > 0 ? { line } : {}) };
}

// Runs the code inside a fresh QuickJS runtime. Call it from a worker thread: see run-sandbox.ts.
export async function runInQuickJs({ code, data, input }: SandboxRequest): Promise<SandboxRun> {
  const QuickJS = await getQuickJS();
  const runtime = QuickJS.newRuntime();
  runtime.setMemoryLimit(MEMORY_LIMIT_BYTES);
  runtime.setMaxStackSize(STACK_LIMIT_BYTES);
  const started = Date.now();
  runtime.setInterruptHandler(shouldInterruptAfterDeadline(started + SANDBOX_TIME_LIMIT_MS));
  const vm = runtime.newContext();
  const logs: string[] = [];

  try {
    installConsole(vm, logs);
    const setup = vm.evalCode(`${HELPERS_SOURCE}\n${frozenGlobal("data", data)}\n${frozenGlobal("input", input ?? {})}`);
    if (setup.error) {
      const raw: unknown = vm.dump(setup.error);
      setup.error.dispose();
      throw new Error(`Sandbox setup failed: ${JSON.stringify(raw)}`);
    }
    setup.value.dispose();

    const wrapped = `JSON.stringify((function () { "use strict";\n${code}\n})() ?? null)`;
    const result = vm.evalCode(wrapped, CODE_FILE_NAME);
    const durationMs = Date.now() - started;
    if (result.error) {
      const raw: unknown = vm.dump(result.error);
      result.error.dispose();
      return { ok: false, error: classify(raw), logs, durationMs };
    }
    const json: unknown = vm.dump(result.value);
    result.value.dispose();
    const text = typeof json === "string" ? json : "null";
    const truncated = text.length > RESULT_LIMIT_CHARS;
    return {
      ok: true,
      value: truncated ? `${text.slice(0, RESULT_LIMIT_CHARS)}…` : (JSON.parse(text) as unknown),
      truncated,
      logs,
      durationMs,
    };
  } finally {
    vm.dispose();
    runtime.dispose();
  }
}
