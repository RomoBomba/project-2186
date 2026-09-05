export const displayStandards = ['civic', 'phosphor', 'amber'] as const;
export type DisplayStandard = (typeof displayStandards)[number];
