import { layouts, type Layout, type SystemConfiguration } from '../setup/model';

// Preserve the configuration proxy: replacing it invalidates unrelated session props.
export function applyDisplayGeometry(
  configuration: SystemConfiguration,
  layout: Layout,
) {
  configuration.layout = layout;
}

export function moveGeometry(cursor: number, key: string): number {
  const direction = key === 'ArrowLeft' || key === 'ArrowUp' ? -1 : 1;
  return (cursor + direction + layouts.length) % layouts.length;
}
