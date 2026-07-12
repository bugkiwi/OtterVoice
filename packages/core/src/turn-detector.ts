import type { TurnDetectionConfig } from './types';

export const DEFAULT_TURN_DETECTION: Required<TurnDetectionConfig> = {
  strategy: 'hybrid',
  minSpeechMs: 500,
  silenceTimeoutMs: 1200,
  maxTurnMs: 120_000,
  volumeThreshold: 0.02,
};

export function resolveTurnDetection(
  config?: TurnDetectionConfig,
): Required<TurnDetectionConfig> {
  return {
    strategy: config?.strategy ?? DEFAULT_TURN_DETECTION.strategy,
    minSpeechMs: config?.minSpeechMs ?? DEFAULT_TURN_DETECTION.minSpeechMs,
    silenceTimeoutMs:
      config?.silenceTimeoutMs ?? DEFAULT_TURN_DETECTION.silenceTimeoutMs,
    maxTurnMs: config?.maxTurnMs ?? DEFAULT_TURN_DETECTION.maxTurnMs,
    volumeThreshold:
      config?.volumeThreshold ?? DEFAULT_TURN_DETECTION.volumeThreshold,
  };
}

export type TurnDetectorEvent = 'speech_start' | 'speech_end' | 'max_turn';

/**
 * Rule-based voice-activity / endpointing detector.
 *
 * It is driven purely by `(volume, timestampMs)` samples fed via
 * {@link TurnDetector.pushVolume}. It tracks whether the user has begun
 * speaking (volume over threshold for `minSpeechMs`) and when they have
 * stopped (volume under threshold for `silenceTimeoutMs`). This keeps the
 * detector free of timers so it is deterministic and trivially testable; the
 * session supplies the clock.
 */
export class TurnDetector {
  private readonly config: Required<TurnDetectionConfig>;
  private speaking = false;
  private speechStartedAt: number | undefined;
  private aboveSince: number | undefined;
  private belowSince: number | undefined;

  constructor(config?: TurnDetectionConfig) {
    this.config = resolveTurnDetection(config);
  }

  get isSpeaking(): boolean {
    return this.speaking;
  }

  get options(): Required<TurnDetectionConfig> {
    return this.config;
  }

  /**
   * Feed a volume sample. Returns an event when a boundary is crossed, else
   * `undefined`.
   *
   * - `speech_start` — sustained volume over threshold for `minSpeechMs`.
   * - `speech_end` — sustained silence for `silenceTimeoutMs` after speech.
   * - `max_turn` — speech has run longer than `maxTurnMs` (forced end).
   */
  pushVolume(volume: number, timestampMs: number): TurnDetectorEvent | undefined {
    const isLoud = volume >= this.config.volumeThreshold;

    if (!this.speaking) {
      if (isLoud) {
        this.belowSince = undefined;
        if (this.aboveSince === undefined) this.aboveSince = timestampMs;
        if (timestampMs - this.aboveSince >= this.config.minSpeechMs) {
          this.speaking = true;
          this.speechStartedAt = this.aboveSince;
          this.aboveSince = undefined;
          return 'speech_start';
        }
      } else {
        this.aboveSince = undefined;
      }
      return undefined;
    }

    // Currently speaking.
    if (
      this.speechStartedAt !== undefined &&
      timestampMs - this.speechStartedAt >= this.config.maxTurnMs
    ) {
      this.reset();
      return 'max_turn';
    }

    if (isLoud) {
      this.belowSince = undefined;
      return undefined;
    }

    if (this.belowSince === undefined) this.belowSince = timestampMs;
    if (timestampMs - this.belowSince >= this.config.silenceTimeoutMs) {
      this.reset();
      return 'speech_end';
    }
    return undefined;
  }

  reset(): void {
    this.speaking = false;
    this.speechStartedAt = undefined;
    this.aboveSince = undefined;
    this.belowSince = undefined;
  }
}
