import { describe, expect, it } from 'bun:test';
import {
  DEFAULT_TURN_DETECTION,
  resolveTurnDetection,
  TurnDetector,
} from '../src/turn-detector';

describe('resolveTurnDetection', () => {
  it('returns defaults when no config is given', () => {
    expect(resolveTurnDetection()).toEqual(DEFAULT_TURN_DETECTION);
  });

  it('overlays partial config over defaults', () => {
    const r = resolveTurnDetection({ strategy: 'volume', silenceTimeoutMs: 800 });
    expect(r.strategy).toBe('volume');
    expect(r.silenceTimeoutMs).toBe(800);
    expect(r.minSpeechMs).toBe(DEFAULT_TURN_DETECTION.minSpeechMs);
  });

  it('honours every overridable field', () => {
    const r = resolveTurnDetection({
      strategy: 'manual',
      minSpeechMs: 1,
      silenceTimeoutMs: 2,
      maxTurnMs: 3,
      volumeThreshold: 4,
    });
    expect(r).toEqual({
      strategy: 'manual',
      minSpeechMs: 1,
      silenceTimeoutMs: 2,
      maxTurnMs: 3,
      volumeThreshold: 4,
    });
  });
});

describe('TurnDetector', () => {
  const cfg = {
    strategy: 'hybrid' as const,
    minSpeechMs: 100,
    silenceTimeoutMs: 200,
    maxTurnMs: 1000,
    volumeThreshold: 0.1,
  };

  it('exposes resolved options and initial silence', () => {
    const d = new TurnDetector(cfg);
    expect(d.options.minSpeechMs).toBe(100);
    expect(d.isSpeaking).toBe(false);
  });

  it('emits speech_start only after sustained loudness', () => {
    const d = new TurnDetector(cfg);
    expect(d.pushVolume(0.5, 0)).toBeUndefined(); // arms aboveSince
    expect(d.pushVolume(0.5, 50)).toBeUndefined(); // not long enough
    expect(d.pushVolume(0.5, 100)).toBe('speech_start');
    expect(d.isSpeaking).toBe(true);
  });

  it('resets the speech timer when volume dips before start', () => {
    const d = new TurnDetector(cfg);
    d.pushVolume(0.5, 0);
    expect(d.pushVolume(0.0, 50)).toBeUndefined(); // dip clears aboveSince
    expect(d.pushVolume(0.5, 60)).toBeUndefined(); // re-arm
    expect(d.pushVolume(0.5, 160)).toBe('speech_start');
  });

  it('ignores silence while not yet speaking', () => {
    const d = new TurnDetector(cfg);
    expect(d.pushVolume(0.0, 0)).toBeUndefined();
    expect(d.isSpeaking).toBe(false);
  });

  it('emits speech_end after sustained silence', () => {
    const d = new TurnDetector(cfg);
    d.pushVolume(0.5, 0);
    d.pushVolume(0.5, 100); // speech_start
    expect(d.pushVolume(0.05, 150)).toBeUndefined(); // arm belowSince
    expect(d.pushVolume(0.5, 200)).toBeUndefined(); // loud resets belowSince
    expect(d.pushVolume(0.05, 260)).toBeUndefined(); // re-arm silence
    expect(d.pushVolume(0.05, 460)).toBe('speech_end');
    expect(d.isSpeaking).toBe(false);
  });

  it('emits max_turn when speech runs too long', () => {
    const d = new TurnDetector(cfg);
    d.pushVolume(0.5, 0);
    d.pushVolume(0.5, 100); // speech_start at t=0
    expect(d.pushVolume(0.5, 1100)).toBe('max_turn');
    expect(d.isSpeaking).toBe(false);
  });

  it('reset() returns to the idle baseline', () => {
    const d = new TurnDetector(cfg);
    d.pushVolume(0.5, 0);
    d.pushVolume(0.5, 100);
    d.reset();
    expect(d.isSpeaking).toBe(false);
    expect(d.pushVolume(0.5, 200)).toBeUndefined();
  });
});
