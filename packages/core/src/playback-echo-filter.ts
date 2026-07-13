export interface PlaybackEchoFilterOptions {
  frameMs?: number;
  maxDelayMs?: number;
  historyMs?: number;
  warmupMs?: number;
  echoMargin?: number;
  noiseFloor?: number;
}

interface Sample {
  at: number;
  level: number;
}

export interface BargeInSpeechGateOptions {
  volumeThreshold?: number;
  windowFrames?: number;
  requiredVoicedFrames?: number;
}

/**
 * Detects speech-shaped residual energy without requiring every audio frame to
 * be loud. Natural speech contains short gaps between syllables; a vote over a
 * moving window rejects isolated knocks while preserving those gaps.
 */
export class BargeInSpeechGate {
  private readonly volumeThreshold: number;
  private readonly windowFrames: number;
  private readonly requiredVoicedFrames: number;
  private votes: number[] = [];

  constructor(options: BargeInSpeechGateOptions = {}) {
    this.volumeThreshold = options.volumeThreshold ?? 0.008;
    this.windowFrames = options.windowFrames ?? 12;
    this.requiredVoicedFrames = options.requiredVoicedFrames ?? 4;
  }

  push(level: number): boolean {
    this.votes.push(level >= this.volumeThreshold ? 1 : 0);
    if (this.votes.length > this.windowFrames) this.votes.shift();
    return this.votes.reduce((sum, vote) => sum + vote, 0) >= this.requiredVoicedFrames;
  }

  reset(): void {
    this.votes = [];
  }
}

/**
 * Removes the component of microphone RMS that is correlated with assistant
 * playback. It searches a short delay window because browser playback,
 * loudspeaker travel and microphone analysis are not sample-synchronous.
 */
export class PlaybackEchoFilter {
  private readonly frameMs: number;
  private readonly maxDelayMs: number;
  private readonly historyMs: number;
  private readonly warmupMs: number;
  private readonly echoMargin: number;
  private readonly noiseFloor: number;
  private output: Sample[] = [];
  private microphone: Sample[] = [];
  private playbackStartedAt: number | undefined;
  private playing = false;

  constructor(options: PlaybackEchoFilterOptions = {}) {
    this.frameMs = options.frameMs ?? 50;
    this.maxDelayMs = options.maxDelayMs ?? 300;
    this.historyMs = options.historyMs ?? 1_200;
    // Cover the beginning of the configured delay-search range. Without this
    // guard, a long-delay echo can briefly look like unrelated foreground
    // speech before enough aligned pairs exist to estimate it.
    this.warmupMs = options.warmupMs ?? 350;
    this.echoMargin = options.echoMargin ?? 1.12;
    this.noiseFloor = options.noiseFloor ?? 0.003;
  }

  start(_at: number): void {
    this.playing = true;
    // The browser may begin playback before its asynchronously decoded output
    // envelope is available. Arm warmup on the first reference frame instead
    // of consuming it while there is nothing meaningful to correlate.
    this.playbackStartedAt = undefined;
    this.output = [];
    this.microphone = [];
  }

  stop(): void {
    this.reset();
  }

  pushOutput(level: number, at: number): void {
    const normalized = Math.max(0, level);
    if (!this.playing) return;
    if (this.playbackStartedAt === undefined) this.playbackStartedAt = at;
    this.output.push({ at, level: normalized });
    this.prune(at);
  }

  filter(microphoneLevel: number, at: number): number {
    const mic = Math.max(0, microphoneLevel);
    // Suppress barge-in until playback reference frames exist. Returning raw
    // microphone energy here would false-trigger during TTS/network latency.
    if (!this.playing) return 0;
    // With no playback reference there is no safe way to distinguish the
    // assistant from the user. Prefer suppressing barge-in briefly over
    // stopping every reply because asynchronous decoding has not finished.
    if (this.output.length === 0) return 0;
    this.microphone.push({ at, level: mic });
    this.prune(at);

    if (
      this.playbackStartedAt !== undefined &&
      at - this.playbackStartedAt < this.warmupMs
    ) {
      return 0;
    }

    const estimate = this.bestEchoEstimate(at);
    if (!estimate) {
      // Until correlation is stable, use a conservative recent peak. This is
      // only reached for a few frames after warmup or near digital silence.
      const recentPeak = Math.max(
        0,
        ...this.output
          .filter((sample) => at - sample.at <= this.maxDelayMs)
          .map((sample) => sample.level),
      );
      return Math.max(0, mic - recentPeak * 0.5 - this.noiseFloor);
    }
    return Math.max(
      0,
      mic - estimate.outputLevel * estimate.gain * this.echoMargin - this.noiseFloor,
    );
  }

  reset(): void {
    this.output = [];
    this.microphone = [];
    this.playbackStartedAt = undefined;
    this.playing = false;
  }

  /** True once enough playback reference frames exist to estimate echo. */
  isReady(at: number): boolean {
    if (!this.playing || this.output.length < 5) return false;
    if (this.playbackStartedAt === undefined) return false;
    return at - this.playbackStartedAt >= this.warmupMs;
  }

  private bestEchoEstimate(at: number):
    | { outputLevel: number; gain: number; score: number }
    | undefined {
    let best: { outputLevel: number; gain: number; score: number } | undefined;
    for (let delay = 0; delay <= this.maxDelayMs; delay += this.frameMs) {
      const pairs = this.microphone
        .map((mic) => ({ mic: mic.level, output: this.outputAt(mic.at - delay) }))
        .filter((pair): pair is { mic: number; output: number } => pair.output !== undefined);
      if (pairs.length < 5) continue;
      const ratios = pairs
        .filter((pair) => pair.output > 0.008)
        .map((pair) => pair.mic / pair.output)
        .sort((a, b) => a - b);
      if (ratios.length < 4) continue;
      // User speech only adds energy, so a low quantile is a robust estimate
      // of acoustic echo gain even when the user talks during calibration.
      const gain = Math.max(
        0.02,
        Math.min(2, ratios[Math.floor((ratios.length - 1) * 0.2)] ?? 0.5),
      );
      const errors = pairs
        .map((pair) => Math.abs(pair.mic - pair.output * gain))
        .sort((a, b) => a - b);
      const kept = errors.slice(0, Math.max(3, Math.ceil(errors.length * 0.6)));
      const robustError = kept.reduce((sum, error) => sum + error, 0) / kept.length;
      const score = 1 / (robustError + 1e-6);
      const outputLevel = this.outputAt(at - delay);
      if (outputLevel === undefined) continue;
      if (!best || score > best.score) best = { outputLevel, gain, score };
    }
    return best;
  }

  private outputAt(target: number): number | undefined {
    let closest: Sample | undefined;
    let distance = Number.POSITIVE_INFINITY;
    for (const sample of this.output) {
      const nextDistance = Math.abs(sample.at - target);
      if (nextDistance < distance) {
        closest = sample;
        distance = nextDistance;
      }
    }
    return distance <= this.frameMs * 0.75 ? closest?.level : undefined;
  }

  private prune(now: number): void {
    const cutoff = now - this.historyMs - this.maxDelayMs;
    this.output = this.output.filter((sample) => sample.at >= cutoff);
    this.microphone = this.microphone.filter((sample) => sample.at >= now - this.historyMs);
  }
}
