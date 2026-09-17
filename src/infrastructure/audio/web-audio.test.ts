import { describe, expect, it, vi } from 'vitest';
import { WebAudioEngine } from './web-audio';
import { audioCues } from './model';
import { designCue, mix } from './presets';

class Param {
  value = 0;
  setValueAtTime = vi.fn((value: number) => {
    this.value = value;
  });
  linearRampToValueAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class Node {
  gain = new Param();
  frequency = new Param();
  Q = new Param();
  connect = vi.fn();
  disconnect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
  type = '';
  onended: (() => void) | null = null;
}
class Context {
  state = 'suspended';
  currentTime = 0;
  destination = new Node();
  nodes: Node[] = [];
  oscillators: Node[] = [];
  createGain = vi.fn(() => this.node());
  createBiquadFilter = vi.fn(() => this.node());
  createOscillator = vi.fn(() => {
    const node = this.node();
    this.oscillators.push(node);
    return node;
  });
  resume = vi.fn(async () => {
    this.state = 'running';
  });
  close = vi.fn(async () => {
    this.state = 'closed';
  });
  node() {
    const node = new Node();
    this.nodes.push(node);
    return node;
  }
  finish() {
    for (const n of this.oscillators) n.onended?.();
  }
}
function setup() {
  const context = new Context();
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { context, factory, audio: new WebAudioEngine(factory) };
}
const submit = { type: audioCues.commandSubmit } as const;
describe('procedural audio boundary', () => {
  it('stays lazy and silent until both enabled and explicitly unlocked', () => {
    const { audio, context, factory } = setup();
    audio.play(submit);
    audio.unlock();
    expect(factory).not.toHaveBeenCalled();
    audio.setEnabled(true);
    audio.play(submit);
    expect(factory).not.toHaveBeenCalled();
    audio.unlock();
    audio.play(submit);
    expect(context.oscillators).toHaveLength(1);
    audio.unlock();
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it('drops suspended cues instead of replaying them after a later resume', async () => {
    const { audio, context } = setup();
    context.resume.mockImplementation(async () => {});
    audio.setEnabled(true);
    audio.unlock();
    audio.play(submit);
    expect(context.oscillators).toHaveLength(0);
    await Promise.resolve();
    context.state = 'running';
    expect(context.oscillators).toHaveLength(0);
    audio.play(submit);
    expect(context.oscillators).toHaveLength(1);
  });
  it('mute stops scheduled notes; unmute reuses the context with no backlog', () => {
    const { audio, context, factory } = setup();
    audio.setEnabled(true);
    audio.unlock();
    audio.play({ type: audioCues.characterConnect, character: 'aura' });
    expect(audio.inspect().voices).toBe(2);
    audio.setEnabled(false);
    expect(audio.inspect().voices).toBe(0);
    for (const node of context.oscillators) {
      expect(node.stop).toHaveBeenLastCalledWith();
      expect(node.disconnect).toHaveBeenCalled();
    }
    audio.play(submit);
    expect(context.oscillators).toHaveLength(2);
    audio.setEnabled(true);
    audio.unlock();
    audio.play(submit);
    expect(context.oscillators).toHaveLength(3);
    expect(factory).toHaveBeenCalledTimes(1);
  });
  it('rate limits rapid keys without delaying submit or accumulating resources', () => {
    const { audio, context } = setup();
    audio.setEnabled(true);
    audio.unlock();
    for (let i = 0; i < 30; i++) {
      context.currentTime = i * 0.01;
      audio.play({ type: audioCues.commandKey, category: 'text' });
      context.finish();
    }
    expect(context.oscillators.length).toBeGreaterThan(1);
    expect(context.oscillators.length).toBeLessThanOrEqual(5);
    const count = context.oscillators.length;
    audio.play(submit);
    expect(context.oscillators).toHaveLength(count + 1);
    context.finish();
    expect(audio.inspect().voices).toBe(0);
  });
  it('caps overlap and master gain conservatively without random variation', () => {
    const { audio, context } = setup();
    audio.setEnabled(true);
    audio.unlock();
    audio.setMasterGain(200);
    expect(audio.inspect().masterGain).toBe(mix.maximumMaster);
    audio.setMasterGain(NaN);
    expect(audio.inspect().masterGain).toBe(mix.maximumMaster);
    for (let i = 0; i < 30; i++) audio.play(submit);
    expect(context.oscillators.length).toBe(mix.maxVoices);
    expect(mix.maxVoices * 0.28 * mix.maximumMaster * mix.ui).toBeLessThan(0.2);
    expect(designCue(submit)).toEqual(designCue(submit));
  });
  it('cancels boot separately, including notes with future start times', () => {
    const { audio, context } = setup();
    audio.setEnabled(true);
    audio.unlock();
    audio.play({ type: audioCues.bootChannel });
    audio.play(submit);
    audio.cancel('boot');
    expect(context.oscillators[0]!.stop).toHaveBeenLastCalledWith();
    expect(context.oscillators[1]!.stop).toHaveBeenLastCalledWith();
    expect(audio.inspect().voices).toBe(1);
    context.finish();
    expect(audio.inspect().voices).toBe(0);
  });
  it('disposes voices, delayed starts and the one context idempotently', () => {
    const { audio, context, factory } = setup();
    audio.setEnabled(true);
    audio.unlock();
    audio.play({ type: audioCues.characterConnect, character: 'aletheia' });
    audio.dispose();
    audio.dispose();
    audio.unlock();
    audio.play(submit);
    expect(context.close).toHaveBeenCalledTimes(1);
    expect(factory).toHaveBeenCalledTimes(1);
    expect(audio.inspect().voices).toBe(0);
    for (const node of context.nodes)
      expect(node.disconnect).toHaveBeenCalled();
  });
  it('silently degrades for missing devices, rejected resume and partial node failure', async () => {
    const absent = new WebAudioEngine(() => {
      throw Error('unsupported');
    });
    expect(() => {
      absent.setEnabled(true);
      absent.unlock();
      absent.play(submit);
      absent.dispose();
    }).not.toThrow();
    const { audio, context } = setup();
    context.resume.mockRejectedValue(Error('blocked'));
    audio.setEnabled(true);
    audio.unlock();
    await Promise.resolve();
    await Promise.resolve();
    expect(() => audio.play(submit)).not.toThrow();
    expect(context.oscillators).toHaveLength(0);
    context.state = 'running';
    context.createBiquadFilter.mockImplementation(() => {
      throw Error('failed node');
    });
    expect(() => audio.play(submit)).not.toThrow();
    expect(audio.inspect().status).toBe('unavailable');
    expect(audio.inspect().voices).toBe(0);
    expect(context.oscillators[0]!.disconnect).toHaveBeenCalled();
  });
  it('has three distinct short character motifs in one shared mix', () => {
    const motifs = (['aletheia', 'aura', 'themis'] as const).map((character) =>
      designCue({ type: audioCues.characterConnect, character }),
    );
    expect(new Set(motifs.map((m) => JSON.stringify(m.tones))).size).toBe(3);
    for (const m of motifs) {
      expect(m.bus).toBe('character');
      expect(Math.max(...m.tones.map((t) => t.at + t.duration))).toBeLessThan(
        0.4,
      );
    }
  });
});

it('drops cues in a hidden document without replay on foreground return', () => {
  const context = new Context();
  let visible = true;
  const audio = new WebAudioEngine(
    () => context as unknown as AudioContext,
    () => visible,
  );
  audio.setEnabled(true);
  audio.unlock();
  visible = false;
  audio.play(submit);
  expect(context.oscillators).toHaveLength(0);
  visible = true;
  expect(context.oscillators).toHaveLength(0);
  audio.play(submit);
  expect(context.oscillators).toHaveLength(1);
});
