import { parentPort, workerData } from "node:worker_threads";
import { runInQuickJs } from "./run-quickjs.js";
import type { SandboxRequest } from "./types.js";

const run = await runInQuickJs(workerData as SandboxRequest);
parentPort?.postMessage(run);
