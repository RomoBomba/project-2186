import type { CharacterProfile } from '../character/profile.ts';
import type { BehaviourDisposition } from '../character/behaviour-policy.ts';
import type { Locale } from '../language/locale.ts';
import type { ResponsePlan } from '../conversation/model.ts';
import type { SelectedMaterial } from '../conversation/material.ts';
export type IntelligenceContext = {
  profile: CharacterProfile;
  disposition: BehaviourDisposition;
  locale: Locale;
  turnIndex: number;
  material: readonly SelectedMaterial[];
};
export type IntelligenceResponse = { text: string; usedMaterialKeys: string[] };
export interface IntelligenceProvider {
  respond(
    context: IntelligenceContext,
    plan: ResponsePlan,
  ): Promise<IntelligenceResponse>;
}
