import { describe, expect, it } from 'bun:test';
import { SessionMetricsTracker } from './session-metrics';

function createTracker(startedAt = 1_000) {
  return new SessionMetricsTracker(startedAt, {
    turnVolumeThreshold: 0.025,
    interruptionVolumeThreshold: 0.055,
  });
}

describe('SessionMetricsTracker', () => {
  it('summarizes turn, pipeline, and interruption timings', () => {
    const tracker = createTracker();

    tracker.observeInputVolume(0.04, 1_200, 'listening');
    tracker.observeInputVolume(0.03, 1_250, 'user_speaking');
    tracker.observeInputVolume(0.01, 1_300, 'user_speaking');
    tracker.recordUserAudioEnd('user-1', 1_800);
    tracker.recordUserAudioFinal('user-1', 1_830);
    tracker.recordAsrFinal('user-1', 2_050);
    tracker.recordE2eLatency(900);
    tracker.recordLlmTtft(420);
    tracker.recordTtsTtfb(680);

    tracker.recordStateChange('listening', 'assistant_speaking', undefined, 2_700);
    tracker.observeInputVolume(0.07, 3_000, 'assistant_speaking');
    tracker.observeInputVolume(0.08, 3_050, 'assistant_speaking');
    tracker.recordStateChange(
      'assistant_speaking',
      'user_speaking',
      'interrupted',
      3_180,
    );
    tracker.recordBackchannel();
    tracker.finish(5_000);

    expect(tracker.snapshot()).toEqual({
      durationMs: 4_000,
      turns: 1,
      interruptions: 1,
      backchannels: 1,
      metrics: {
        e2eLatencyMs: { averageMs: 900, sampleCount: 1 },
        transcriptionDelayMs: { averageMs: 250, sampleCount: 1 },
        endOfTurnDelayMs: { averageMs: 550, sampleCount: 1 },
        turnCommitDelayMs: { averageMs: 30, sampleCount: 1 },
        interruptionDetectionMs: { averageMs: 180, sampleCount: 1 },
        llmTtftMs: { averageMs: 420, sampleCount: 1 },
        ttsTtfbMs: { averageMs: 680, sampleCount: 1 },
      },
    });
  });

  it('averages repeated samples and ignores invalid durations', () => {
    const tracker = createTracker();
    tracker.recordE2eLatency(800);
    tracker.recordE2eLatency(1_000);
    tracker.recordE2eLatency(Number.NaN);
    tracker.recordLlmTtft(-1);

    const snapshot = tracker.snapshot(2_000);
    expect(snapshot.metrics.e2eLatencyMs).toEqual({
      averageMs: 900,
      sampleCount: 2,
    });
    expect(snapshot.metrics.llmTtftMs).toEqual({ sampleCount: 0 });
  });

  it('resets an interruption candidate when loud input is not sustained', () => {
    const tracker = createTracker();
    tracker.observeInputVolume(0.07, 1_200, 'assistant_speaking');
    tracker.observeInputVolume(0.01, 1_250, 'assistant_speaking');
    tracker.recordStateChange(
      'assistant_speaking',
      'user_speaking',
      'interrupted',
      1_500,
    );

    const snapshot = tracker.snapshot(1_500);
    expect(snapshot.interruptions).toBe(1);
    expect(snapshot.metrics.interruptionDetectionMs).toEqual({ sampleCount: 0 });
  });
});
