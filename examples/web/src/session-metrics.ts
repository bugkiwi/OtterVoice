export type SessionMetricKey =
  | 'e2eLatencyMs'
  | 'transcriptionDelayMs'
  | 'endOfTurnDelayMs'
  | 'turnCommitDelayMs'
  | 'interruptionDetectionMs'
  | 'llmTtftMs'
  | 'ttsTtfbMs';

export interface SessionMetricSummary {
  averageMs?: number;
  sampleCount: number;
}

export interface SessionMetricsSnapshot {
  durationMs: number;
  turns: number;
  interruptions: number;
  backchannels: number;
  metrics: Record<SessionMetricKey, SessionMetricSummary>;
}

export interface SessionMetricsOptions {
  turnVolumeThreshold: number;
  interruptionVolumeThreshold: number;
}

type ObservableSessionState =
  | 'listening'
  | 'processing'
  | 'user_speaking'
  | 'assistant_speaking'
  | string;

const metricKeys: SessionMetricKey[] = [
  'e2eLatencyMs',
  'transcriptionDelayMs',
  'endOfTurnDelayMs',
  'turnCommitDelayMs',
  'interruptionDetectionMs',
  'llmTtftMs',
  'ttsTtfbMs',
];

/** Collect browser-observable timing samples for one web demo session. */
export class SessionMetricsTracker {
  private readonly samples = new Map<SessionMetricKey, number[]>();
  private readonly userAudioEndedAt = new Map<string, number>();
  private readonly countedTurns = new Set<string>();
  private lastUserVoiceAt: number | undefined;
  private interruptionCandidateAt: number | undefined;
  private endedAt: number | undefined;
  private interruptionCount = 0;
  private backchannelCount = 0;

  constructor(
    private readonly startedAt: number,
    private readonly options: SessionMetricsOptions,
  ) {}

  observeInputVolume(
    level: number,
    at: number,
    state: ObservableSessionState,
  ): void {
    if (
      state === 'listening' ||
      state === 'processing' ||
      state === 'user_speaking'
    ) {
      if (level >= this.options.turnVolumeThreshold) this.lastUserVoiceAt = at;
      return;
    }

    if (state !== 'assistant_speaking') return;
    if (level >= this.options.interruptionVolumeThreshold) {
      this.interruptionCandidateAt ??= at;
    } else {
      this.interruptionCandidateAt = undefined;
    }
  }

  recordStateChange(
    from: ObservableSessionState,
    to: ObservableSessionState,
    reason: string | undefined,
    at: number,
  ): void {
    if (to === 'assistant_speaking') this.interruptionCandidateAt = undefined;
    if (
      from !== 'assistant_speaking' ||
      to !== 'user_speaking' ||
      reason !== 'interrupted'
    ) {
      return;
    }

    this.interruptionCount += 1;
    if (this.interruptionCandidateAt !== undefined) {
      this.addSample(
        'interruptionDetectionMs',
        at - this.interruptionCandidateAt,
      );
      this.lastUserVoiceAt = this.interruptionCandidateAt;
    }
    this.interruptionCandidateAt = undefined;
  }

  recordUserAudioEnd(turnId: string, at: number): void {
    this.userAudioEndedAt.set(turnId, at);
    if (!this.countedTurns.has(turnId)) {
      this.countedTurns.add(turnId);
    }
    if (this.lastUserVoiceAt !== undefined) {
      this.addSample('endOfTurnDelayMs', at - this.lastUserVoiceAt);
    }
    this.lastUserVoiceAt = undefined;
  }

  recordUserAudioFinal(turnId: string, at: number): void {
    this.recordFromTurnEnd('turnCommitDelayMs', turnId, at);
  }

  recordAsrFinal(turnId: string, at: number): void {
    this.recordFromTurnEnd('transcriptionDelayMs', turnId, at);
  }

  recordE2eLatency(valueMs: number): void {
    this.addSample('e2eLatencyMs', valueMs);
  }

  recordLlmTtft(valueMs: number): void {
    this.addSample('llmTtftMs', valueMs);
  }

  recordTtsTtfb(valueMs: number): void {
    this.addSample('ttsTtfbMs', valueMs);
  }

  recordBackchannel(): void {
    this.backchannelCount += 1;
  }

  finish(at: number): void {
    this.endedAt = Math.max(this.startedAt, at);
  }

  snapshot(at = this.endedAt ?? this.startedAt): SessionMetricsSnapshot {
    const metrics = Object.fromEntries(metricKeys.map((key) => {
      const values = this.samples.get(key) ?? [];
      const averageMs = values.length > 0
        ? values.reduce((sum, value) => sum + value, 0) / values.length
        : undefined;
      return [
        key,
        {
          ...(averageMs !== undefined ? { averageMs } : {}),
          sampleCount: values.length,
        },
      ];
    })) as Record<SessionMetricKey, SessionMetricSummary>;

    return {
      durationMs: Math.max(0, at - this.startedAt),
      turns: this.countedTurns.size,
      interruptions: this.interruptionCount,
      backchannels: this.backchannelCount,
      metrics,
    };
  }

  private recordFromTurnEnd(
    metric: SessionMetricKey,
    turnId: string,
    at: number,
  ): void {
    const origin = this.userAudioEndedAt.get(turnId);
    if (origin !== undefined) this.addSample(metric, at - origin);
  }

  private addSample(metric: SessionMetricKey, valueMs: number): void {
    if (!Number.isFinite(valueMs) || valueMs < 0) return;
    const values = this.samples.get(metric) ?? [];
    values.push(valueMs);
    this.samples.set(metric, values);
  }
}
