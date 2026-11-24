import { AgentActivity } from "@/components/beui/components/agents/agent-activity";
import {
  Message,
  MessageBubble,
  MessageContent,
  MessageGroup,
  MessageMarker,
} from "@/components/beui/components/agents/message";
import { MessageBubbleContent } from "@/components/beui/components/agents/message-bubble";
import { useMemo } from "react";
import type { Turn } from "../types.js";
import { ChatActionsProvider } from "./chat-actions.js";
import { toActivityItems } from "./activity-items.js";
import { AGENT_NAME, Mascot } from "./mascot.js";
import { NextStepPrompt } from "./next-step-prompt.js";
import { PlannerProgress } from "./planner-progress.js";
import { UiRenderer } from "./ui-renderer.js";

function elapsedSeconds(turn: Turn): number {
  return Math.max(0, Math.round(((turn.finishedAt ?? Date.now()) - turn.startedAt) / 1000));
}

type TurnViewProps = Readonly<{
  turn: Turn;
  current: boolean;
  canAnswer: boolean;
  onSend: (text: string) => void;
  onAnswerNextStep: (turnId: number, accepted: boolean) => void;
}>;

export function TurnView({ turn, current, canAnswer, onSend, onAnswerNextStep }: TurnViewProps) {
  const working = turn.status === "working";
  const actions = useMemo(() => ({ send: onSend, canSend: canAnswer, current }), [onSend, canAnswer, current]);
  const items = toActivityItems(turn.activity);

  return (
    <MessageGroup spacing="default">
      <Message from="user" animateIn>
        <MessageContent>
          <MessageBubble variant="soft">
            <MessageBubbleContent className="rounded-[18px] rounded-br-md text-[15px] text-ink [&>span[aria-hidden]]:bg-island-soft">
              {turn.prompt}
            </MessageBubbleContent>
          </MessageBubble>
        </MessageContent>
      </Message>

      <Message from="assistant">
        <MessageContent className="w-full gap-3">
          <div className="flex items-center gap-2">
            <Mascot decorative className="size-8" />
            <span className="font-display text-base font-semibold text-ink">{AGENT_NAME}</span>
          </div>

          {working || items.length > 0 ? (
            <AgentActivity
              items={items}
              status={working ? "working" : "complete"}
              duration={elapsedSeconds(turn)}
              contentType="mixed"
              activeLabel="Planejando sua viagem"
              collapseOnComplete
              className="w-full"
            />
          ) : null}

          {turn.guardrail ? (
            <MessageMarker className="mx-0">Fora do planejamento de viagens</MessageMarker>
          ) : null}

          {turn.progress.map((entry) => (
            <PlannerProgress key={entry.toolUseId} progress={entry.progress} active={working} />
          ))}

          <ChatActionsProvider value={actions}>
            {turn.interfaces.map((spec, index) => (
              <UiRenderer key={index} spec={spec} />
            ))}
          </ChatActionsProvider>

          {turn.answer ? (
            <p className="max-w-[66ch] text-[15px] leading-7 whitespace-pre-wrap text-ink">{turn.answer}</p>
          ) : null}

          {turn.nextStep ? (
            <NextStepPrompt
              nextStep={turn.nextStep}
              choice={turn.nextStepChoice}
              current={current}
              disabled={!canAnswer}
              onAnswer={(accepted) => onAnswerNextStep(turn.id, accepted)}
            />
          ) : null}

          {turn.stoppedByLimit ? (
            <MessageMarker className="mx-0">
              Parei depois de muitas etapas. Peça uma ou duas coisas por vez que eu termino o plano.
            </MessageMarker>
          ) : null}

          {turn.status === "cancelled" ? (
            <MessageMarker className="mx-0">Você interrompeu esta resposta.</MessageMarker>
          ) : null}

          {turn.status === "failed" ? (
            <MessageMarker className="mx-0 bg-destructive/10 text-destructive">{turn.error}</MessageMarker>
          ) : null}
        </MessageContent>
      </Message>
    </MessageGroup>
  );
}
