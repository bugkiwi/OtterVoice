import { describe, expect, it } from 'bun:test';
import { BargeInSpeechGate, PlaybackEchoFilter } from '../src/playback-echo-filter';

const FRAME_MS = 50;
const output = Array.from(
  { length: 60 },
  (_, index) => 0.045 + ((index * 7) % 13) * 0.009,
);

function runLoop(options: {
  delayFrames: number;
  echoGain: number;
  knockFrame?: number;
  userStartFrame?: number;
  userEndFrame?: number;
}) {
  const filter = new PlaybackEchoFilter({ frameMs: FRAME_MS });
  filter.start(0);
  const gate = new BargeInSpeechGate();
  const residuals: number[] = [];
  const events: Array<{ frame: number; event: string }> = [];
  for (let frame = 0; frame < output.length; frame += 1) {
    const at = frame * FRAME_MS;
    filter.pushOutput(output[frame]!, at);
    const echoed = (output[frame - options.delayFrames] ?? 0) * options.echoGain;
    const noise = ((frame % 3) - 1) * 0.0008;
    const knock = frame === options.knockFrame ? 0.22 : 0;
    const user =
      options.userStartFrame !== undefined &&
      options.userEndFrame !== undefined &&
      frame >= options.userStartFrame &&
      frame <= options.userEndFrame
        ? frame % 4 === 0
          ? 0.002
          : 0.075 + (frame % 2) * 0.008
        : 0;
    const residual = filter.filter(Math.max(0, echoed + noise + knock + user), at);
    residuals.push(residual);
    if (gate.push(residual)) events.push({ frame, event: 'speech_start' });
  }
  return { residuals, events };
}

describe('PlaybackEchoFilter acoustic loopback simulation', () => {
  it('suppresses barge-in before playback reference frames are active', () => {
    const filter = new PlaybackEchoFilter({ frameMs: FRAME_MS });
    const gate = new BargeInSpeechGate();
    expect(filter.filter(0.12, 0)).toBe(0);
    expect(gate.push(filter.filter(0.12, 50))).toBe(false);
    filter.start(0);
    expect(filter.filter(0.09, 0)).toBe(0);
    expect(gate.push(filter.filter(0.09, 0))).toBe(false);
  });

  it('does not arm barge-in before the first asynchronously decoded output frame', () => {
    const filter = new PlaybackEchoFilter({ frameMs: FRAME_MS });
    const gate = new BargeInSpeechGate();
    filter.start(0);

    // Playback is already audible, but its reference envelope arrives late.
    for (let at = 350; at < 600; at += FRAME_MS) {
      expect(gate.push(filter.filter(0.09, at))).toBe(false);
    }

    // Warmup starts here, when correlation can actually begin.
    for (let at = 600; at < 900; at += FRAME_MS) {
      filter.pushOutput(0.12, at);
      expect(gate.push(filter.filter(0.09, at))).toBe(false);
    }
  });

  for (const delayFrames of [0, 1, 3, 5]) {
    it(`rejects assistant-only echo with ${delayFrames * FRAME_MS}ms delay`, () => {
      const result = runLoop({ delayFrames, echoGain: 0.72 });
      expect(result.events.some(({ event }) => event === 'speech_start')).toBe(false);
    });
  }

  it('rejects a one-frame desk knock over delayed assistant echo', () => {
    const result = runLoop({ delayFrames: 3, echoGain: 0.65, knockFrame: 24 });
    expect(result.events.some(({ event }) => event === 'speech_start')).toBe(false);
    expect(result.residuals[24]).toBeGreaterThan(0.1);
  });

  it('detects sustained user speech over delayed assistant echo', () => {
    const result = runLoop({
      delayFrames: 3,
      echoGain: 0.65,
      userStartFrame: 16,
      userEndFrame: 34,
    });
    const speechStart = result.events.find(({ event }) => event === 'speech_start');
    expect(speechStart).toBeDefined();
    expect(speechStart!.frame - 16).toBeLessThanOrEqual(8);
  });

  it('supports an early welcome-message interruption after warmup', () => {
    const result = runLoop({
      delayFrames: 2,
      echoGain: 0.55,
      userStartFrame: 2,
      userEndFrame: 20,
    });
    const speechStart = result.events.find(({ event }) => event === 'speech_start');
    expect(speechStart).toBeDefined();
    expect(speechStart!.frame * FRAME_MS).toBeLessThanOrEqual(700);
  });
});
