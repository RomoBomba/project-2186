import type { AudioCue, AudioEngine, AudioScope } from './model';
import { audioCues } from './model';
import { designCue, mix, type Tone } from './presets';

type Voice = { scope: AudioScope; stop: () => void };
/** Browser primitives live here only. Construction is inert, even during SSR. */
export class WebAudioEngine implements AudioEngine {
  private context: AudioContext | undefined;
  private master: GainNode | undefined;
  private buses: Record<'ui' | 'terminal' | 'character', GainNode> | undefined;
  private voices = new Set<Voice>();
  private enabled = false;
  private disposed = false;
  private failed = false;
  private gain: number = mix.master;
  private lastKey = -Infinity;
  private resuming = false;
  private recent: AudioCue['type'][] = [];
  inspect() {
    return {
      enabled: this.enabled,
      status: this.disposed
        ? 'disposed'
        : this.failed
          ? 'unavailable'
          : (this.context?.state ?? 'locked'),
      voices: this.voices.size,
      masterGain: this.gain,
      recent: [...this.recent],
    };
  }
  constructor(
    private readonly createContext: () => AudioContext = () =>
      new AudioContext(),
    private readonly foreground: () => boolean = () =>
      typeof document === 'undefined' || !document.hidden,
  ) {}
  unlock() {
    if (!this.enabled || this.disposed || this.failed) return;
    try {
      if (!this.context) {
        const c = (this.context = this.createContext());
        this.master = c.createGain();
        this.master.gain.value = this.gain;
        this.master.connect(c.destination);
        this.buses = Object.fromEntries(
          (['ui', 'terminal', 'character'] as const).map((name) => {
            const node = c.createGain();
            node.gain.value = mix[name];
            node.connect(this.master!);
            return [name, node];
          }),
        ) as Record<'ui' | 'terminal' | 'character', GainNode>;
      }
      if (this.context.state !== 'running' && !this.resuming) {
        this.resuming = true;
        void this.context
          .resume()
          .catch(() => {})
          .finally(() => {
            this.resuming = false;
          });
      }
    } catch {
      this.fail();
    }
  }
  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.cancel();
    try {
      if (this.master && this.context)
        this.master.gain.setValueAtTime(
          enabled ? this.gain : 0,
          this.context.currentTime,
        );
    } catch {
      this.fail();
    }
  }
  setMasterGain(value: number) {
    if (!Number.isFinite(value)) return;
    this.gain = Math.max(0, Math.min(mix.maximumMaster, value));
    this.setEnabled(this.enabled);
  }
  play(cue: AudioCue) {
    const c = this.context;
    if (
      !this.enabled ||
      this.disposed ||
      this.failed ||
      !c ||
      c.state !== 'running' ||
      !this.buses ||
      !this.foreground()
    )
      return;
    try {
      if (cue.type === audioCues.commandKey) {
        if (c.currentTime - this.lastKey < 0.065) return;
        this.lastKey = c.currentTime;
      }
      const design = designCue(cue);
      // Never steal a sounding voice. Drop excess cues rather than increase loudness.
      if (this.voices.size + design.tones.length > mix.maxVoices) return;
      this.recent = [...this.recent, cue.type].slice(-16);
      for (const note of design.tones)
        this.schedule(note, design.scope, this.buses[design.bus]);
    } catch {
      this.fail();
    }
  }
  private schedule(note: Tone, scope: AudioScope, bus: GainNode) {
    const c = this.context!;
    const oscillator = c.createOscillator();
    const nodes: AudioNode[] = [oscillator];
    let stopped = false;
    const voice: Voice = {
      scope,
      stop: () => {
        if (stopped) return;
        stopped = true;
        oscillator.onended = null;
        try {
          oscillator.stop();
        } catch {
          /* Already ended. */
        }
        for (const node of nodes) {
          try {
            node.disconnect();
          } catch {
            /* Detached. */
          }
        }
        this.voices.delete(voice);
      },
    };
    this.voices.add(voice);
    oscillator.onended = voice.stop;
    const envelope = c.createGain();
    nodes.push(envelope);
    const filter = c.createBiquadFilter();
    nodes.push(filter);
    const start = c.currentTime + note.at,
      end = start + note.duration;
    oscillator.type = note.waveform;
    oscillator.frequency.setValueAtTime(note.frequency, start);
    if (note.endFrequency)
      oscillator.frequency.linearRampToValueAtTime(note.endFrequency, end);
    filter.type = 'lowpass';
    filter.frequency.value = note.cutoff;
    filter.Q.value = 0.5;
    envelope.gain.setValueAtTime(0, start);
    envelope.gain.linearRampToValueAtTime(note.gain, start + note.attack);
    envelope.gain.exponentialRampToValueAtTime(0.0001, end - 0.002);
    envelope.gain.linearRampToValueAtTime(0, end);
    oscillator.connect(filter);
    filter.connect(envelope);
    envelope.connect(bus);
    oscillator.start(start);
    oscillator.stop(end + 0.005);
  }
  cancel(scope?: AudioScope) {
    for (const voice of [...this.voices])
      if (!scope || voice.scope === scope) voice.stop();
  }
  private fail() {
    this.failed = true;
    this.cancel();
    this.close();
  }
  private close() {
    for (const node of [...Object.values(this.buses ?? {}), this.master]) {
      try {
        node?.disconnect();
      } catch {
        /* Failed backend. */
      }
    }
    try {
      void this.context?.close().catch(() => {});
    } catch {
      /* Already unavailable. */
    }
    this.buses = undefined;
    this.master = undefined;
    this.context = undefined;
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.cancel();
    this.close();
  }
}
