import { useCallback, useEffect, useRef, useState } from "react";
import { applyServerMessage, chooseNextStep, startTurn } from "./chat-state.js";
import { parseServerMessage } from "./protocol.js";
import type { ChatSocket, ConnectionStatus, SessionInfo, Turn } from "./types.js";

const FINISHING_MESSAGES: ReadonlySet<string> = new Set(["answer", "cancelled", "error"]);

export function useChatSocket(): ChatSocket {
  const socketRef = useRef<WebSocket | null>(null);
  const nextTurnId = useRef(0);
  const [turns, setTurns] = useState<ReadonlyArray<Turn>>([]);
  const [status, setStatus] = useState<ConnectionStatus>("connecting");
  const [session, setSession] = useState<SessionInfo | undefined>(undefined);

  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss" : "ws";
    const socket = new WebSocket(`${protocol}://${window.location.host}/ws`);
    socketRef.current = socket;

    socket.addEventListener("close", () => {
      if (socketRef.current === socket) setStatus("disconnected");
    });

    socket.addEventListener("message", (event: MessageEvent<unknown>) => {
      const message = parseServerMessage(event.data);
      if (!message) return;

      if (message.type === "ready") {
        setSession({
          provider: message.provider,
          model: message.model,
          promptMaxLength: message.promptMaxLength,
        });
        setStatus("ready");
        return;
      }

      setTurns((previous) => applyServerMessage(previous, message, Date.now()));
      if (FINISHING_MESSAGES.has(message.type)) setStatus("ready");
    });

    return () => {
      socketRef.current = null;
      socket.close();
    };
  }, []);

  const send = useCallback(
    (text: string) => {
      const socket = socketRef.current;
      if (!socket || socket.readyState !== WebSocket.OPEN || status !== "ready") return;
      const id = nextTurnId.current;
      nextTurnId.current += 1;
      setTurns((previous) => startTurn(previous, id, text, Date.now()));
      setStatus("busy");
      socket.send(JSON.stringify({ type: "prompt", text }));
    },
    [status],
  );

  const cancel = useCallback(() => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) return;
    socket.send(JSON.stringify({ type: "cancel" }));
  }, []);

  const answerNextStep = useCallback(
    (turnId: number, accepted: boolean) => {
      const turn = turns.find((candidate) => candidate.id === turnId);
      if (!turn?.nextStep || turn.nextStepChoice !== "pending") return;
      setTurns((previous) => chooseNextStep(previous, turnId, accepted ? "accepted" : "declined"));
      if (accepted) send(turn.nextStep.confirmPrompt);
    },
    [turns, send],
  );

  return { turns, status, session, send, cancel, answerNextStep };
}
