export const systemActions = [
  'return',
  'new',
  'configuration',
  'intelligence',
] as const;
export type SystemAction = (typeof systemActions)[number];
export type Screen = 'gate' | 'terminal' | 'setup' | 'selection' | 'edit';
export function menuKey(
  index: number,
  key: string,
  menu: boolean,
): { index: number; action?: SystemAction; handled: boolean } {
  const direction = ['ArrowUp', 'ArrowLeft'].includes(key)
    ? -1
    : ['ArrowDown', 'ArrowRight'].includes(key)
      ? 1
      : 0;
  if (direction)
    return {
      index: (index + direction + systemActions.length) % systemActions.length,
      handled: true,
    };
  if (key === 'Enter')
    return { index, action: systemActions[index]!, handled: true };
  if (key === 'Escape' && menu)
    return { index, action: 'return', handled: true };
  return { index, handled: false };
}
// Persisted configuration seeds the gate once; it is never a navigation event.
export function routeForAction(action: SystemAction): Screen {
  return {
    return: 'terminal',
    new: 'setup',
    configuration: 'edit',
    intelligence: 'selection',
  }[action] as Screen;
}
export function routeAfterConfiguration(
  screen: Screen,
  origin: 'gate' | 'terminal',
): Screen {
  return screen === 'edit' ? origin : screen === 'setup' ? 'selection' : screen;
}

// Only the immediate caller is needed; no transcript or persistent state is copied.
export type SelectorOrigin = 'gate' | 'terminal' | 'setup';
export function selectorReturn(origin: SelectorOrigin) {
  return { screen: origin, setupStage: 'audio' as const };
}
