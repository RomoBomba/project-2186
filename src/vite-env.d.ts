interface Window {
  project2186Audio?: {
    inspect: () => unknown;
    preview: (cue: import('./infrastructure/audio/model').AudioCue) => void;
  };
  project2186Memory?: { inspect: () => Promise<unknown> };
}
