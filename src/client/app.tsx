import { MessageScroller } from "@/components/beui/components/agents/message";
import { cn } from "@/components/beui/lib/utils";
import { Composer } from "./components/composer.js";
import { EmptyState } from "./components/empty-state.js";
import { AGENT_NAME, Mascot } from "./components/mascot.js";
import { TurnView } from "./components/turn-view.js";
import type { ConnectionStatus } from "./types.js";
import { useChatSocket } from "./use-chat-socket.js";

const DEFAULT_PROMPT_MAX_LENGTH = 2000;

const statusLabel: Readonly<Record<ConnectionStatus, string>> = {
  connecting: "Conectando",
  ready: "Disponível",
  busy: "Planejando",
  disconnected: "Sem conexão. Recarregue a página para reconectar.",
};

function ConnectionIndicator({ status }: { status: ConnectionStatus }) {
  return (
    <span className="flex items-center gap-2 text-xs text-muted-foreground" role="status">
      <span
        aria-hidden="true"
        className={cn(
          "size-2 rounded-full ring-[1.5px] ring-ink",
          status === "ready" && "bg-island",
          status === "busy" && "animate-pulse bg-route",
          status === "connecting" && "bg-card",
          status === "disconnected" && "bg-pin",
        )}
      />
      {statusLabel[status]}
    </span>
  );
}

export function App() {
  const { turns, status, session, send, cancel, answerNextStep } = useChatSocket();
  const busy = status === "busy";
  const started = turns.length > 0;

  return (
    <div className="flex h-dvh flex-col">
      <header className={cn("border-b border-transparent transition-colors", started && "border-border bg-card/70 backdrop-blur")}>
        <div className="mx-auto flex h-16 w-full max-w-3xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-2.5">
            <Mascot decorative className="size-10" />
            <div className="flex flex-col">
              <h1 className="font-display text-xl leading-none font-semibold text-ink">{AGENT_NAME}</h1>
              <span className="mt-1 text-xs leading-none text-muted-foreground">Seu agente de férias</span>
            </div>
          </div>
          <ConnectionIndicator status={status} />
        </div>
      </header>

      <main className="min-h-0 flex-1">
        {started ? (
          <MessageScroller
            className="h-full"
            label="Conversa sobre a viagem"
            busy={busy}
            contentClassName="mx-auto flex w-full max-w-3xl flex-col gap-10 px-4 py-8"
          >
            {turns.map((turn, index) => (
              <TurnView
                key={turn.id}
                turn={turn}
                current={index === turns.length - 1}
                canAnswer={status === "ready"}
                onSend={send}
                onAnswerNextStep={answerNextStep}
              />
            ))}
          </MessageScroller>
        ) : (
          <EmptyState disabled={status !== "ready"} onPick={send} />
        )}
      </main>

      <footer className="mx-auto w-full max-w-3xl px-4 pt-2 pb-4">
        <Composer
          maxLength={session?.promptMaxLength ?? DEFAULT_PROMPT_MAX_LENGTH}
          busy={busy}
          disabled={status === "connecting" || status === "disconnected"}
          onSubmit={send}
          onCancel={cancel}
        />
      </footer>
    </div>
  );
}
