// Configuration identity only; no character runtime is instantiated here.
export const characterIds = ['aletheia', 'aura', 'themis'] as const;
export type CharacterId = (typeof characterIds)[number];
