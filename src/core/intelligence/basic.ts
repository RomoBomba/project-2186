import { realizeSelf } from './self-surface.ts';
import { disclosureVoices } from '../../characters/disclosure.ts';
import { memoryVoices } from '../../characters/memory.ts';
import { contextLimit } from '../../characters/context.ts';
import { compose } from './surface.ts';
import { characterVoices } from '../../characters/voices.ts';
import { materialKey } from '../conversation/model.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import { sentenceCount } from '../conversation/material.ts';
import type {
  IntelligenceContext,
  IntelligenceProvider,
  IntelligenceResponse,
} from './provider.ts';
export class BasicIntelligenceProvider implements IntelligenceProvider {
  async respond(
    context: IntelligenceContext,
    plan: ResponsePlan,
  ): Promise<IntelligenceResponse> {
    if (plan.selfMaterial && plan.selfMaterial.query.kind !== 'identity')
      return { text: realizeSelf(plan, context.locale), usedMaterialKeys: [] };
    if (plan.userGroundedMaterial) {
      const item = plan.userGroundedMaterial;
      return {
        text: disclosureVoices[context.profile.id][context.locale][
          item.kind
        ].replace('{value}', () => item.value),
        usedMaterialKeys: [],
      };
    }
    const memory = plan.longTermContext?.find(
      (item) => item.id === plan.acknowledgeMemoryId,
    );
    if (
      memory &&
      (memory.kind === 'preference' ||
        memory.kind === 'interest' ||
        memory.kind === 'project')
    ) {
      return {
        text: memoryVoices[context.profile.id][context.locale][memory.kind],
        usedMaterialKeys: [],
        usedMemoryIds: [memory.id],
      };
    }
    const voice = characterVoices[context.profile.id][context.locale];
    const select = (phrases: readonly string[]) =>
      phrases[Math.max(0, Math.floor(context.turnIndex)) % phrases.length]!;
    if (plan.strategy === 'greet')
      return { text: select(voice.greeting), usedMaterialKeys: [] };
    if (plan.strategy === 'identify_self')
      return { text: select(voice.identity), usedMaterialKeys: [] };
    if (plan.contextReference?.exhausted)
      return { text: contextLimit[context.locale], usedMaterialKeys: [] };
    if (plan.strategy === 'admit_uncertainty')
      return { text: select(voice.uncertainty), usedMaterialKeys: [] };
    if (!plan.selectedMaterial.length)
      return { text: select(voice.clarification), usedMaterialKeys: [] };
    const parts: string[] = [];
    const usedMaterialKeys: string[] = [];
    // Material references, not input keywords, govern realization. No re-matching.
    for (const ref of plan.selectedMaterial) {
      const item = context.material.find(
        (item) => materialKey(item.reference) === materialKey(ref),
      );
      if (!item || usedMaterialKeys.includes(materialKey(ref))) continue;
      const candidate = compose([...parts, item.text], plan);
      if (
        candidate.length > plan.desiredLength.maxCharacters ||
        sentenceCount(candidate) > plan.desiredLength.maxSentences
      )
        continue;
      parts.push(item.text);
      usedMaterialKeys.push(materialKey(ref));
    }
    return {
      text: parts.length ? compose(parts, plan) : select(voice.uncertainty),
      usedMaterialKeys,
    };
  }
}
