import type { IntelligenceRequest } from '../core/intelligence/grounding.ts';
import type { IntelligenceResponse } from '../core/intelligence/provider.ts';
import type { RealizationSlot } from '../core/intelligence/realization-slots.ts';

const sentences = (text: string) =>
  (text.match(/[^.!?…]+(?:[.!?…]+|$)/gu) ?? [])
    .map((s) => s.trim())
    .filter(Boolean);

/** Reuse the actual approved composition, including its sole licensed fusion.
 * Basic is memoized by the caller; this does not re-plan or advance a conversation. */
export function realizationSlots(
  request: IntelligenceRequest,
  basic: IntelligenceResponse,
): RealizationSlot[] {
  const grounds = request.grounding.material;
  const slots: RealizationSlot[] = [];
  const add = (
    role: RealizationSlot['role'],
    texts: string[],
    keys: string[],
    mode: RealizationSlot['mode'],
    mayFuse = false,
  ) => {
    if (!keys.length) return;
    slots.push({
      id: 's' + slots.length,
      role,
      allowedGroundingKeys: keys,
      sourceTexts: texts,
      mayFuse,
      required: role !== 'optional_follow_up',
      mode,
      ...(keys.some(
        (k) => grounds.find((g) => g.key === k)?.source === 'memory',
      )
        ? { memorySource: 'semantic' as const }
        : {}),
    });
  };
  const composition = basic.composition;
  if (composition) {
    let start = 0;
    if (composition.fusion === 'parallel') {
      const pair = composition.units.slice(0, 2);
      if (
        pair.length === 2 &&
        pair.every((u) => grounds.some((g) => g.key === u.key))
      ) {
        add(
          'nucleus',
          pair.map((u) => u.text),
          pair.map((u) => u.key),
          'paraphrase',
          true,
        );
        start = 2;
      }
    }
    for (const unit of composition.units.slice(start)) {
      const ground = grounds.find((g) => g.key === unit.key);
      const key =
        ground?.key ??
        grounds.find(
          (g) =>
            g.source === 'policy' &&
            (unit.role === 'stance_acknowledgment'
              ? g.kind === 'stance_acknowledgment'
              : g.kind === 'limitation'),
        )?.key;
      if (!key) continue;
      // Use reviewed composition wording, not an enum pretending to be a statement.
      // Truth/knowledge distinctions are deliberately copy-only until reviewed variants exist.
      const copy =
        !ground ||
        /knowledge|truth/u.test(key) ||
        unit.role === 'optional_follow_up';
      for (const text of sentences(unit.text))
        add(unit.role, [text], [key], copy ? 'copy' : 'paraphrase');
    }
  } else {
    // No decomposition means no authority to attribute a factual multi-ground
    // legacy sentence to a policy key. Leave Local without slots: fail closed.
    if (basic.usedMaterialKeys.length) return [];
    // Identity, disclosure, semantic-memory acknowledgement and policy-only replies
    // have no decomposed composition: preserve their already-authored realization.
    const memory = grounds.find(
      (g) =>
        g.source === 'memory' &&
        request.constraints.permittedMemoryKeys.includes(g.key),
    );
    const key =
      memory?.key ??
      grounds.find((g) => g.source === 'user')?.key ??
      grounds.find((g) => g.source === 'policy')?.key;
    for (const text of sentences(basic.text))
      add(
        text.endsWith('?')
          ? 'optional_follow_up'
          : slots.length
            ? 'support'
            : 'nucleus',
        [text],
        key ? [key] : [],
        'copy',
      );
  }
  return slots;
}
