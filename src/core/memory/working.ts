import {
  advanceReasoningFocus,
  type ReasoningFocus,
} from '../reasoning/focus.ts';
import type { Locale } from '../language/locale.ts';
import type { ConceptId } from '../knowledge/model.ts';
import type { Perception } from '../conversation/perception.ts';
import {
  initialResponseHistory,
  recordResponse,
  type ResponseHistory,
  type ResponsePlan,
  type ResponseStrategy,
} from '../conversation/model.ts';
export type RecentTurn = {
  speaker: 'user' | 'intelligence';
  text: string;
  index: number;
  conceptIds: ConceptId[];
  act?: Perception['act'];
  strategy?: ResponseStrategy;
};
export type WorkingMemory = {
  reasoningFocus?: ReasoningFocus;
  history: ResponseHistory;
  recentTurns: RecentTurn[];
  activeConceptIds: ConceptId[];
  currentThread?: {
    primaryConceptId: ConceptId;
    associatedConceptId?: ConceptId;
    startedTurn: number;
    lastActiveTurn: number;
  };
  lastResponse?: {
    plan: ResponsePlan;
    materialKeys: string[];
    turn: number;
    locale: Locale;
  };
  pendingQuestion?: { text: string; turn: number; conceptIds: ConceptId[] };
};
export function initialWorkingMemory(): WorkingMemory {
  return {
    history: initialResponseHistory(),
    recentTurns: [],
    activeConceptIds: [],
  };
}
// Commit only completed exchanges. Eight speaker turns = four exchanges.
export function completeExchange(
  previous: WorkingMemory,
  message: string,
  perception: Perception,
  plan: ResponsePlan,
  response: { text: string; usedMaterialKeys: string[] },
  locale: Locale,
): WorkingMemory {
  const history = recordResponse(
    previous.history,
    plan.strategy,
    response.usedMaterialKeys,
  );
  const turn = history.turn;
  const ids = response.usedMaterialKeys.length
    ? [plan.primaryConceptId, plan.associatedConceptId].filter(
        (id): id is ConceptId => !!id,
      )
    : [];
  const oldThread = previous.currentThread;
  const thread = ids[0]
    ? {
        primaryConceptId: ids[0],
        ...(ids[1] ? { associatedConceptId: ids[1] } : {}),
        startedTurn:
          oldThread?.primaryConceptId === ids[0] ? oldThread.startedTurn : turn,
        lastActiveTurn: turn,
      }
    : oldThread && turn - oldThread.lastActiveTurn < 3
      ? oldThread
      : undefined;
  const question =
    plan.selectedMaterial.some(
      (ref) =>
        ref.kind === 'question' &&
        response.usedMaterialKeys.includes(
          `${ref.conceptId}:${ref.kind}:${ref.index}`,
        ),
    ) && response.text.endsWith('?');
  const reasoningFocus = advanceReasoningFocus(
    previous.reasoningFocus,
    plan,
    turn,
    locale,
    perception.matches.filter((m) => m.score >= 85).map((m) => m.conceptId),
  );
  return {
    ...(reasoningFocus ? { reasoningFocus } : {}),
    history,
    recentTurns: [
      ...previous.recentTurns,
      {
        speaker: 'user' as const,
        text: message.slice(0, 512),
        index: turn * 2 - 1,
        conceptIds: ids,
        act: perception.act,
      },
      {
        speaker: 'intelligence' as const,
        text: response.text.slice(0, 1024),
        index: turn * 2,
        conceptIds: ids,
        strategy: plan.strategy,
      },
    ].slice(-8),
    activeConceptIds: thread
      ? [thread.primaryConceptId, thread.associatedConceptId].filter(
          (id): id is ConceptId => !!id,
        )
      : [],
    ...(thread ? { currentThread: thread } : {}),
    lastResponse: {
      plan: JSON.parse(JSON.stringify(plan)) as ResponsePlan,
      materialKeys: [...response.usedMaterialKeys],
      turn,
      locale,
    },
    ...(question
      ? {
          pendingQuestion: {
            text:
              response.text.match(/[^.!?]+[?]$/u)?.[0]?.trim() ??
              response.text.slice(0, 1024),
            turn,
            conceptIds: ids,
          },
        }
      : {}),
  };
}
