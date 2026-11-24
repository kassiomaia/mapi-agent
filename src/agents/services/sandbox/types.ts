export type SandboxErrorKind = "syntax" | "runtime" | "timeout" | "memory" | "crash";

export type SandboxError = Readonly<{ kind: SandboxErrorKind; message: string; line?: number | undefined }>;

export type SandboxRequest = Readonly<{
  code: string;
  data: unknown;
  input: unknown;
}>;

export type SandboxRun =
  | Readonly<{
      ok: true;
      value: unknown;
      truncated: boolean;
      logs: ReadonlyArray<string>;
      durationMs: number;
    }>
  | Readonly<{
      ok: false;
      error: SandboxError;
      logs: ReadonlyArray<string>;
      durationMs: number;
    }>;
