import type { SemanticRole } from './composition.ts';

/** Presentation projection only; never a cognition decision or persistent record. */
export type RealizationSlot = {
  id: string;
  role: SemanticRole;
  allowedGroundingKeys: string[];
  sourceTexts: string[];
  mayFuse: boolean;
  required: boolean;
  mode: 'paraphrase' | 'copy';
  // Phase 11B packets contain semantic memories only. No episodic source is inferred.
  memorySource?: 'semantic';
};
