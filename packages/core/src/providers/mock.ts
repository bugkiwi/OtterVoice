import type {
  ASRProvider,
  ASRResult,
  ASRSession,
  LLMGenerateInput,
  LLMGenerateOutput,
  LLMProvider,
  LLMStreamChunk,
  NormalizedVoiceError,
  PronunciationInput,
  PronunciationProvider,
  PronunciationResult,
  TTSInput,
  TTSOutput,
  TTSProvider,
} from '../types';

// ---------------------------------------------------------------------------
// Mock ASR
// ---------------------------------------------------------------------------

export interface MockASROptions {
  /** Scripted final transcripts, emitted one per `sendAudio` call. */
  transcripts: string[];
  /** Emit a partial (half-length) result before each final. Default true. */
  emitPartials?: boolean;
  /** When set, the next `sendAudio` triggers this error instead of a result. */
  failWith?: NormalizedVoiceError;
}

/**
 * Deterministic ASR for tests and the developer profile. Each `sendAudio`
 * advances through `transcripts`; partial + final callbacks fire synchronously.
 */
export function createMockASR(options: MockASROptions): ASRProvider {
  const { transcripts, emitPartials = true, failWith } = options;
  // Shared across sessions so a scripted conversation advances one final per
  // `sendAudio`, even though each user turn opens a fresh ASR session.
  let index = 0;
  return {
    name: 'mock_asr',
    capabilities: {
      streaming: true,
      batch: false,
      partialResults: true,
      confidence: true,
      languages: ['en'],
    },
    async createSession(): Promise<ASRSession> {
      let partialCb: ((r: ASRResult) => void) | undefined;
      let finalCb: ((r: ASRResult) => void) | undefined;
      let errorCb: ((e: NormalizedVoiceError) => void) | undefined;
      let closed = false;

      return {
        sendAudio() {
          if (closed) return;
          if (failWith) {
            errorCb?.(failWith);
            return;
          }
          const text = transcripts[index] ?? '';
          index += 1;
          if (emitPartials && text.length > 0) {
            partialCb?.({
              text: text.slice(0, Math.max(1, Math.floor(text.length / 2))),
              confidence: 0.5,
            });
          }
          finalCb?.({ text, confidence: 1 });
        },
        async stop() {},
        async close() {
          closed = true;
        },
        onPartial(cb) {
          partialCb = cb;
          return () => {
            partialCb = undefined;
          };
        },
        onFinal(cb) {
          finalCb = cb;
          return () => {
            finalCb = undefined;
          };
        },
        onError(cb) {
          errorCb = cb;
          return () => {
            errorCb = undefined;
          };
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock LLM
// ---------------------------------------------------------------------------

export interface MockLLMOptions {
  /**
   * Reply generator. Receives the input and 0-based call index. Defaults to
   * echoing the last user message.
   */
  reply?: (input: LLMGenerateInput, callIndex: number) => string;
  usage?: LLMGenerateOutput['usage'];
  /** When set, `generate`/`stream` reject with this error. */
  failWith?: NormalizedVoiceError;
}

function lastUserContent(input: LLMGenerateInput): string {
  for (let i = input.messages.length - 1; i >= 0; i -= 1) {
    const msg = input.messages[i];
    if (msg && msg.role === 'user') return msg.content;
  }
  return '';
}

export function createMockLLM(options: MockLLMOptions = {}): LLMProvider {
  const {
    reply = (input) => `You said: ${lastUserContent(input)}`,
    usage = { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
    failWith,
  } = options;
  let calls = 0;

  return {
    name: 'mock_llm',
    async generate(input: LLMGenerateInput): Promise<LLMGenerateOutput> {
      if (failWith) throw failWith;
      const text = reply(input, calls);
      calls += 1;
      const out: LLMGenerateOutput = { text, usage };
      if (input.responseFormat === 'json') {
        try {
          out.json = JSON.parse(text);
        } catch {
          out.json = { text };
        }
      }
      return out;
    },
    async *stream(input: LLMGenerateInput): AsyncIterable<LLMStreamChunk> {
      if (failWith) {
        yield { type: 'error', error: failWith };
        return;
      }
      const text = reply(input, calls);
      calls += 1;
      for (const word of text.split(' ')) {
        yield { type: 'text_delta', text: word + ' ' };
      }
      yield { type: 'usage', usage };
      yield { type: 'done' };
    },
  };
}

// ---------------------------------------------------------------------------
// Mock TTS
// ---------------------------------------------------------------------------

export interface MockTTSOptions {
  /** Estimated playback duration in ms; defaults to 60ms per character. */
  durationMsPerChar?: number;
  failWith?: NormalizedVoiceError;
}

export function createMockTTS(options: MockTTSOptions = {}): TTSProvider {
  const { durationMsPerChar = 60, failWith } = options;
  return {
    name: 'mock_tts',
    capabilities: {
      streaming: false,
      voices: [
        { id: 'mock-voice', name: 'Mock Voice', language: 'en', gender: 'neutral' },
      ],
      formats: ['mp3', 'wav', 'pcm'],
      languages: ['en'],
    },
    async synthesize(input: TTSInput): Promise<TTSOutput> {
      if (failWith) throw failWith;
      const bytes = new TextEncoder().encode(input.text);
      const out: TTSOutput = {
        audioBuffer: bytes.buffer.slice(0) as ArrayBuffer,
        mimeType: `audio/${input.format ?? 'mp3'}`,
        durationMs: input.text.length * durationMsPerChar,
        cached: input.cacheKey !== undefined,
      };
      return out;
    },
  };
}

// ---------------------------------------------------------------------------
// Mock pronunciation
// ---------------------------------------------------------------------------

export interface MockPronunciationOptions {
  score?: number;
  failWith?: NormalizedVoiceError;
}

export function createMockPronunciation(
  options: MockPronunciationOptions = {},
): PronunciationProvider {
  const { score = 80, failWith } = options;
  return {
    name: 'mock_pronunciation',
    async assess(input: PronunciationInput): Promise<PronunciationResult> {
      if (failWith) throw failWith;
      return {
        overall: score,
        accuracy: score,
        fluency: score,
        completeness: score,
        words: input.transcript
          .split(/\s+/)
          .filter((w) => w.length > 0)
          .map((text) => ({ text, score })),
      };
    },
  };
}
