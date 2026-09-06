import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  segmentTransmission,
  startSemanticTransmission,
} from './SemanticTransmission';
afterEach(() => vi.useRealTimers());
describe('semantic presentation', () => {
  it.each([
    'Я думаю, что здесь смешаны два разных вопроса. Что различает их?',
    'A short phrase, followed by another sentence. Why?',
    '  Quoted «слово»; another phrase — and an ending!  ',
    'ЭтоОченьДлинноеСловоБезПробеловКотороеНельзяРазрывать',
  ])('preserves content and word boundaries: %s', (text) => {
    const chunks = segmentTransmission(text);
    expect(chunks.map((c) => c.text).join('')).toBe(text);
    expect(chunks.flatMap((c) => c.text.match(/\S+/gu) ?? [])).toEqual(
      text.match(/\S+/gu),
    );
    expect(chunks.every((c) => c.text.trim().length > 0)).toBe(true);
  });
  it('groups words and varies sentence/phrase/length pauses', () => {
    const chunks = segmentTransmission(
      'Сначала обозначим границы этого вопроса, затем проверим возможные последствия.',
    );
    expect(chunks[0]?.text).toBe('Сначала обозначим границы этого вопроса,');
    expect(chunks.at(-1)?.text).toMatch(/последствия\.$/u);
    expect(chunks.at(-1)!.pauseAfter).toBeGreaterThan(chunks[0]!.pauseAfter);
    const long = segmentTransmission(
      'one two three four five six seven eight nine ten eleven twelve',
    );
    expect(long).toHaveLength(2);
    expect(long.every((c) => c.text.trim().split(/\s+/u).length === 6)).toBe(
      true,
    );
  });
  it('keeps short clauses whole and absorbs brief introductory commas', () => {
    expect(
      segmentTransmission(
        'Мне интересно, что именно ты подразумеваешь под этим.',
      ).map((c) => c.text),
    ).toEqual(['Мне интересно, что именно ты подразумеваешь под этим.']);
    expect(
      segmentTransmission('I wonder, what exactly do you mean by that?'),
    ).toHaveLength(1);
    const chunks = segmentTransmission(
      'one two three four five six seven eight nine ten eleven',
    );
    expect(chunks.map((c) => c.text.trim().split(/\s+/u).length)).toEqual([
      6, 5,
    ]);
  });
  it('holds the first phrase deliberately and supports optional presentation hints', () => {
    vi.useFakeTimers();
    const chunks = segmentTransmission('First sentence. Second sentence.');
    const normalChunk = vi.fn();
    const hintedChunk = vi.fn();
    const normal = startSemanticTransmission(chunks, normalChunk, vi.fn());
    startSemanticTransmission(chunks, hintedChunk, vi.fn(), false, {
      formingDelay: 0,
      pauseAfter: { 0: 0 },
    });
    vi.advanceTimersByTime(100);
    expect(normalChunk).not.toHaveBeenCalled();
    expect(hintedChunk).toHaveBeenCalledTimes(2);
    normal.cancel();
  });
  it('reduced motion bypasses slow hints, including during the forming delay', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    const playback = startSemanticTransmission(
      segmentTransmission('One sentence. Another sentence.'),
      vi.fn(),
      complete,
      false,
      { formingDelay: 5000, pauseAfter: { 0: 5000 } },
    );
    playback.reduceMotion();
    vi.advanceTimersByTime(100);
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reveals progressively, completes once and stops scheduling', () => {
    vi.useFakeTimers();
    const chunks = segmentTransmission(
      'First phrase. Another longer phrase, with an ending.',
    );
    const seen: string[] = [];
    const complete = vi.fn();
    startSemanticTransmission(chunks, (c) => seen.push(c), complete);
    expect(seen).toEqual([]);
    vi.advanceTimersToNextTimer();
    expect(seen).toEqual([chunks[0]!.text]);
    expect(complete).not.toHaveBeenCalled();
    vi.runAllTimers();
    expect(seen.join('')).toBe(chunks.map((c) => c.text).join(''));
    expect(complete).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('cancels mid-transmission with no stale chunks or completion', () => {
    vi.useFakeTimers();
    const chunk = vi.fn();
    const complete = vi.fn();
    const playback = startSemanticTransmission(
      segmentTransmission('First sentence. Second sentence.'),
      chunk,
      complete,
    );
    vi.advanceTimersToNextTimer();
    playback.cancel();
    vi.runAllTimers();
    expect(chunk).toHaveBeenCalledTimes(1);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });
  it('reduced motion preserves order and finishes sooner, including preference changes', () => {
    vi.useFakeTimers();
    const text = 'First sentence. Second sentence. Third sentence.';
    const chunks = segmentTransmission(text);
    let normal = '';
    let reduced = '';
    const normalDone = vi.fn();
    const reducedDone = vi.fn();
    const playback = startSemanticTransmission(
      chunks,
      (c) => (normal += c),
      normalDone,
    );
    startSemanticTransmission(chunks, (c) => (reduced += c), reducedDone, true);
    while (!reducedDone.mock.calls.length) vi.advanceTimersToNextTimer();
    expect(reduced).toBe(text);
    expect(normalDone).not.toHaveBeenCalled();
    playback.reduceMotion();
    vi.runAllTimers();
    expect(normal).toBe(text);
    expect(normalDone).toHaveBeenCalledTimes(1);
  });
  it('can cancel before the first chunk and completes empty content safely', () => {
    vi.useFakeTimers();
    const complete = vi.fn();
    startSemanticTransmission([], vi.fn(), complete);
    vi.runAllTimers();
    expect(complete).toHaveBeenCalledTimes(1);
    const chunk = vi.fn();
    const cancelled = startSemanticTransmission(
      segmentTransmission('Text.'),
      chunk,
      complete,
    );
    cancelled.cancel();
    vi.runAllTimers();
    expect(chunk).not.toHaveBeenCalled();
  });
});
