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
  surfaceHistory?: import('./composition.ts').SurfaceHistory;
  recentMaterialKeys?: readonly string[];
  material: readonly SelectedMaterial[];
  relationMaterial?: readonly {
    reference: import('../reasoning/model.ts').RelationRef;
    text: string;
    kind?: import('../reasoning/model.ts').RelationUnit['kind'];
  }[];
};
export type IntelligenceResponse = {
  text: string;
  usedMaterialKeys: string[];
  usedMemoryIds?: string[];
  composition?: import('./composition.ts').ResponseComposition;
};
export interface IntelligenceProvider {
  respond(
    context: IntelligenceContext,
    plan: ResponsePlan,
  ): Promise<IntelligenceResponse>;
}
