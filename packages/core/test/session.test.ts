import { describe, expect, it, mock } from 'bun:test';
import {
  createOtterVoiceSession,
  createVoiceSession,
  VoiceSession,
} from '../src/session';
import { VoiceError } from '../src/errors';
import {
  createMockASR,
  createMockAudioLLM,
} from '../src/providers/mock';
import {
  createMockRuntime,
  MockAudioInput,
  MockAudioOutput,
} from '../src/providers/mock-runtime';
import type {
  AudioLLMProvider,
  ASRProvider,
  ASRResult,
  ASRSessionOptions,
  NormalizedVoiceError,
  VoiceSessionConfig,
} from '../src/types';

// --- helpers ---------------------------------------------------------------

function seqId(): () => string {
  let n = 0;
  return () => `id${(n += 1)}`;
}

function clock(start = 1000) {
  let t = start;
  return {
    now: () => t,
    set: (v: number) => {
      t = v;
    },
  };
}

/** Resolve when the session transitions *to* `state`. */
function nextState(session: VoiceSession, to: string): Promise<void> {
  return new Promise((resolve) => {
    const off = session.on('statechange', (e) => {
      if (e.to === to) {
        off();
        resolve();
      }
    });
  });
}

function emitChunk(runtime: ReturnType<typeof createMockRuntime>, durationMs?: number) {
  runtime.audioInput.emitChunk({
    data: new ArrayBuffer(4),
    timestamp: 1,
    ...(durationMs !== undefined ? { durationMs } : {}),
  });
}

function calibrateEchoOnly(
  runtime: ReturnType<typeof createMockRuntime>,
  time: ReturnType<typeof clock>,
  endAt = 950,
) {
  for (let at = 0; at <= endAt; at += 50) {
    time.set(at);
    runtime.audioOutput.emitVolume(0.1);
    runtime.audioInput.emitVolume(0.06);
  }
}

interface Harness {
  session: VoiceSession;
  runtime: ReturnType<typeof createMockRuntime>;
  events: Array<[string, unknown]>;
}

function makeSession(overrides: Partial<VoiceSessionConfig> = {}): Harness {
  const runtime = createMockRuntime();
  const audioLlm: AudioLLMProvider = {
    name: 'mock_audio_turn',
    async generate(input) {
      const text = 'assistant reply';
      await input.onTranscriptDelta?.(text);
      return {
        text,
        audioBuffer: new TextEncoder().encode(text).buffer,
        mimeType: 'audio/mpeg',
        usage: { inputTokens: 10, outputTokens: 5, totalTokens: 15 },
      };
    },
  };
  const providers = {
    asr: createMockASR({ transcripts: ['hello there', 'second turn', 'third'] }),
    audioLlm,
    ...(overrides.providers ?? {}),
  };
  const config: VoiceSessionConfig = {
    mode: 'half_duplex',
    runtime,
    generateId: seqId(),
    now: clock().now,
    ...overrides,
    providers,
  };
  const session = createVoiceSession(config);
  const events: Array<[string, unknown]> = [];
  for (const name of [
    'statechange',
    'asr_partial',
    'asr_final',
    'user_audio_end',
    'user_audio_final',
    'assistant_text_delta',
    'assistant_text',
    'assistant_audio_start',
    'assistant_audio_end',
    'assistant_audio',
    'turn',
    'usage',
    'finished',
    'error',
  ] as const) {
    session.on(name, (p) => events.push([name, p]));
  }
  return { session, runtime, events };
}

/** A hand-driven ASR whose emissions tests trigger directly. */
function controllableASR(options: {
  finalOnStop?: string;
  batch?: boolean;
} = {}) {
  let partialCb: ((r: ASRResult) => void) | undefined;
  let finalCb: ((r: ASRResult) => void) | undefined;
  let errorCb: ((e: NormalizedVoiceError) => void) | undefined;
  const ctl = {
    options: undefined as ASRSessionOptions | undefined,
    interimResultsEnabled: [] as boolean[],
    sentAudio: [] as number[][],
    sendImpl: undefined as undefined | ((chunk: ArrayBuffer) => unknown),
    stop: mock(async () => {
      if (options.finalOnStop !== undefined) {
        finalCb?.({ text: options.finalOnStop, confidence: 1 });
      }
    }),
    close: mock(async () => {}),
    emitPartial: (r: ASRResult) => partialCb?.(r),
    emitFinal: (r: ASRResult) => finalCb?.(r),
    emitError: (e: NormalizedVoiceError) => errorCb?.(e),
  };
  const provider: ASRProvider = {
    name: 'ctl_asr',
    capabilities: {
      streaming: true,
      batch: options.batch ?? false,
      partialResults: true,
      languages: ['en'],
    },
    async createSession(sessionOptions) {
      ctl.options = sessionOptions;
      return {
        sendAudio: (chunk) => {
          ctl.sentAudio.push([...new Uint8Array(chunk)]);
          return ctl.sendImpl?.(chunk);
        },
        setInterimResultsEnabled(enabled) {
          ctl.interimResultsEnabled.push(enabled);
        },
        stop: ctl.stop,
        close: ctl.close,
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
  return { provider, ctl };
}

// --- tests -----------------------------------------------------------------

describe('VoiceSession lifecycle', () => {
  it('provides a collision-resistant factory alias', () => {
    const runtime = createMockRuntime();
    const session = createOtterVoiceSession({
      mode: 'half_duplex',
      runtime,
      providers: {
        asr: createMockASR({ transcripts: [] }),
        audioLlm: createMockAudioLLM(),
      },
    });
    expect(session).toBeInstanceOf(VoiceSession);
  });


  it('uses a provider-owned input transcript and plays encoded audio segments in order without client ASR', async () => {
    const runtime = createMockRuntime();
    const audioLlm: AudioLLMProvider = {
      name: 'server-cascaded-voice',
      transcribesInput: true,
      async generate(input) {
        await input.onInputTranscript?.('server transcript');
        await input.onTranscriptDelta?.('first.');
        await input.onAudioSegment?.({
          data: new Uint8Array([1, 2]).buffer,
          mimeType: 'audio/mpeg',
          sequence: 0,
        });
        await input.onTranscriptDelta?.(' second.');
        await input.onAudioSegment?.({
          data: new Uint8Array([3, 4]).buffer,
          mimeType: 'audio/mpeg',
          sequence: 1,
        });
        return {
          inputText: 'server transcript',
          text: 'first. second.',
          audioBuffer: new Uint8Array([1, 2, 3, 4]).buffer,
          mimeType: 'audio/mpeg',
        };
      },
    };
    const session = createOtterVoiceSession({
      mode: 'half_duplex',
      audioLlmStartTiming: 'after_audio',
      runtime,
      generateId: seqId(),
      providers: { audioLlm },
    });
    const events: Array<[string, unknown]> = [];
    for (const name of [
      'asr_final',
      'assistant_text_delta',
      'assistant_text',
      'assistant_audio_start',
      'assistant_audio_end',
    ] as const) {
      session.on(name, (event) => events.push([name, event]));
    }

    await session.start();
    runtime.audioInput.emitChunk({
      data: new Uint8Array([9]).buffer,
      timestamp: 1,
      durationMs: 100,
      encoding: 'audio/webm;codecs=opus',
      delivery: 'turn',
    });
    const audioEnded = new Promise<void>((resolve) => {
      session.once('assistant_audio_end', () => resolve());
    });
    await session.endUserTurn();
    await audioEnded;

    expect(runtime.audioOutput.played.map((item) => ({
      bytes: [...new Uint8Array(item.audioBuffer ?? new ArrayBuffer(0))],
      mimeType: item.mimeType,
    }))).toEqual([
      { bytes: [1, 2], mimeType: 'audio/mpeg' },
      { bytes: [3, 4], mimeType: 'audio/mpeg' },
    ]);
    expect(session.getTurns().map((turn) => ({
      role: turn.role,
      text: turn.text,
    }))).toEqual([
      { role: 'user', text: 'server transcript' },
      { role: 'assistant', text: 'first. second.' },
    ]);
    expect(events.filter(([name]) => name === 'asr_final')).toHaveLength(1);
    expect(events.filter(([name]) => name === 'assistant_audio_start')).toHaveLength(1);
    expect(events.filter(([name]) => name === 'assistant_audio_end')).toHaveLength(1);
  });

  it('start() rejects unless idle', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start();
    await expect(session.start()).rejects.toBeInstanceOf(VoiceError);
  });


  it('supports off() to detach an event listener', async () => {
    const { session } = makeSession();
    const seen: string[] = [];
    const cb = (e: { to: string }) => seen.push(e.to);
    session.on('statechange', cb);
    session.off('statechange', cb);
    await session.start();
    expect(seen).toHaveLength(0);
  });

  it('starts by opening the microphone', async () => {
    const { session, events } = makeSession();
    await session.start();
    expect(events.some(([n]) => n === 'assistant_text')).toBe(false);
    expect(session.state).toBe('listening');
  });

  it('does not auto-listen when policy disables it', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start();
    expect(session.state).toBe('starting');
  });


});

describe('VoiceSession turn loop', () => {

  it('emits complete user and assistant audio snapshots with stable turn ids', async () => {
    const { provider: asr, ctl: asrCtl } = controllableASR({
      batch: true,
      finalOnStop: 'archived user',
    });
    const audioLlm: AudioLLMProvider = {
      name: 'archivable-audio-llm',
      async generate() {
        return {
          text: 'archived reply',
          audioBuffer: new Uint8Array([8, 9]).buffer,
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, runtime, events } = makeSession({
      providers: { asr, audioLlm } as any,
    });
    await session.start();
    runtime.audioInput.emitChunk({
      data: new Uint8Array([99]).buffer,
      timestamp: 1,
      durationMs: 100,
      encoding: 'audio/webm;codecs=opus',
      delivery: 'stream',
    });
    runtime.audioInput.emitChunk({
      data: new Uint8Array([1, 2, 3, 4]).buffer,
      timestamp: 2,
      durationMs: 200,
      encoding: 'audio/webm;codecs=opus',
      delivery: 'turn',
    });
    const answered = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await answered;

    const userAudio = events.find(([name]) => name === 'user_audio_final')?.[1] as {
      turnId: string;
      audio: ArrayBuffer;
      format: string;
      durationMs: number;
    };
    const userText = events.find(([name]) => name === 'asr_final')?.[1] as {
      turnId: string;
    };
    expect([...new Uint8Array(userAudio.audio)]).toEqual([1, 2, 3, 4]);
    expect(asrCtl.sentAudio).toEqual([[99], [1, 2, 3, 4]]);
    expect(userAudio).toMatchObject({
      turnId: userText.turnId,
      format: 'audio/webm;codecs=opus',
      durationMs: 200,
    });

    const assistantAudio = events.find(([name]) => name === 'assistant_audio')?.[1] as {
      turnId: string;
      audio: ArrayBuffer;
      mimeType: string;
    };
    const assistantText = events.find(([name]) => name === 'assistant_text')?.[1] as {
      turnId: string;
    };
    expect(assistantAudio.turnId).toBe(assistantText.turnId);
    expect([...new Uint8Array(assistantAudio.audio)]).toEqual([8, 9]);
    expect(assistantAudio.mimeType).toBe('audio/wav');
  });

  it('retries a retryable Audio LLM failure before any stream output', async () => {
    let attempts = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'retryable-audio-llm',
      async generate() {
        attempts += 1;
        if (attempts === 1) {
          throw new VoiceError({
            code: 'network_error',
            message: 'temporary gateway failure',
            retryable: true,
          });
        }
        return {
          text: 'retry succeeded',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, runtime, events } = makeSession({
      audioLlmRetry: { maxAttempts: 2, backoffMs: 0 },
      providers: { audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const answered = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await answered;

    expect(attempts).toBe(2);
    expect(events.some(([name]) => name === 'error')).toBe(false);
  });

  it('can report exhausted Audio LLM retries and keep listening', async () => {
    let attempts = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'unavailable-audio-llm',
      async generate() {
        attempts += 1;
        throw new VoiceError({
          code: 'network_error',
          message: 'provider unavailable',
          retryable: true,
        });
      },
    };
    const { session, runtime, events } = makeSession({
      audioLlmRetry: {
        maxAttempts: 2,
        backoffMs: 0,
        continueSessionOnFailure: true,
      },
      providers: { audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const reported = new Promise<void>((resolve) => session.once('error', () => resolve()));
    const listening = nextState(session, 'listening');
    await session.endUserTurn();
    await reported;
    await listening;

    expect(attempts).toBe(2);
    expect(session.state).toBe('listening');
    expect(events.find(([name]) => name === 'error')?.[1]).toMatchObject({
      provider: 'unavailable-audio-llm',
      stage: 'provider',
      fatal: false,
    });
  });

  it('runs native audio LLM output while keeping ASR for the user transcript', async () => {
    let audioCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate(input) {
        audioCalls += 1;
        expect(input.audio.byteLength).toBe(4);
        expect(input.format).toBe('webm');
        await input.onTranscriptDelta?.('语音');
        await input.onTranscriptDelta?.('模型回复');
        return {
          text: '语音模型回复',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, runtime, events } = makeSession({
      providers: { audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const speaking = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await speaking;

    expect(audioCalls).toBe(1);
    expect(runtime.audioOutput.played.at(-1)?.mimeType).toBe('audio/wav');
    expect(events.some(([name]) => name === 'user_audio_end')).toBe(true);
    expect(
      events
        .filter(([name]) => name === 'assistant_text_delta')
        .map(([, payload]) => (payload as { text: string }).text),
    ).toEqual(['语音', '语音模型回复']);
    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' && (payload as { text: string }).text === '语音模型回复',
      ),
    ).toBe(true);
  });

  it('passes a native WAV turn to the audio LLM without treating it as WebM', async () => {
    let receivedFormat: string | undefined;
    const audioLlm: AudioLLMProvider = {
      name: 'native-wav-audio-llm',
      async generate(input) {
        receivedFormat = input.format;
        return {
          text: 'native reply',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, runtime } = makeSession({
      providers: { audioLlm } as any,
    });
    await session.start();
    runtime.audioInput.emitChunk({
      data: new Uint8Array([82, 73, 70, 70]).buffer,
      timestamp: 1,
      encoding: 'audio/wav',
    });
    const speaking = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await speaking;

    expect(receivedFormat).toBe('wav');
  });

  it('finalizes audio input before generating a native audio reply', async () => {
    const runtime = createMockRuntime();
    const { provider } = controllableASR({ finalOnStop: 'hello there' });
    const originalStop = runtime.audioInput.stop.bind(runtime.audioInput);
    runtime.audioInput.stop = async () => {
      runtime.audioInput.emitChunk({
        data: new Uint8Array([5, 6, 7]).buffer,
        timestamp: 2,
      });
      await originalStop();
    };
    let generatedAudio: Uint8Array | undefined;
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate(input) {
        expect(runtime.audioInput.started).toBe(false);
        generatedAudio = new Uint8Array(input.audio);
        return {
          text: '语音模型回复',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session } = makeSession({
      runtime,
      providers: { asr: provider, audioLlm } as any,
    });
    await session.start();
    runtime.audioInput.emitChunk({
      data: new Uint8Array([1, 2, 3, 4]).buffer,
      timestamp: 1,
    });
    const speaking = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await speaking;

    expect(generatedAudio).toEqual(new Uint8Array([1, 2, 3, 4, 5, 6, 7]));
  });

  it('runs a full mocked turn and accumulates usage', async () => {
    const { session, runtime, events } = makeSession();
    await session.start();

    const back = nextState(session, 'listening');
    emitChunk(runtime, 1200);
    await back;

    const turns = session.getTurns();
    expect(turns.map((t) => t.role)).toEqual(['user', 'assistant']);
    expect(turns[0]?.text).toBe('hello there');

    const usage = session.getUsage();
    expect(usage.asrAudioMs).toBe(1200);
    expect(usage.llmInputTokens).toBe(10);
    expect(usage.assistantSpeechChars).toBeGreaterThan(0);

    // partial + final + audio events fired
    expect(events.some(([n]) => n === 'asr_partial')).toBe(true);
    expect(events.some(([n]) => n === 'asr_final')).toBe(true);
    expect(events.some(([n]) => n === 'user_audio_final')).toBe(true);
    const deltas = events.filter(([n]) => n === 'assistant_text_delta');
    expect(deltas.length).toBeGreaterThan(0);
    expect((deltas.at(-1)?.[1] as { text: string }).text.trim()).toBe('assistant reply');
    expect(events.some(([n]) => n === 'assistant_audio_start')).toBe(true);
    expect(events.some(([n]) => n === 'assistant_audio')).toBe(true);
    expect(events.some(([n]) => n === 'assistant_audio_end')).toBe(true);
  });

  it('ignores a chunk without durationMs for asr metering', async () => {
    const { session, runtime } = makeSession();
    await session.start();
    const back = nextState(session, 'listening');
    emitChunk(runtime); // no durationMs
    await back;
    expect(session.getUsage().asrAudioMs).toBe(0);
  });

  it('records confidence and speech duration from an ASR final', async () => {
    const { provider, ctl } = controllableASR();
    const { session, events } = makeSession({ providers: { asr: provider } as any });
    await session.start();
    const back = nextState(session, 'listening');
    ctl.emitPartial({ text: 'partial', confidence: 0.4 });
    ctl.emitFinal({ text: 'final words', confidence: 0.9, startMs: 100, endMs: 900 });
    await back;
    const final = events.find(([n]) => n === 'asr_final')?.[1] as any;
    expect(final.confidence).toBe(0.9);
    expect(final.durationMs).toBe(800);
    expect(session.getUsage().userSpeechMs).toBe(800);
  });


});

describe('VoiceSession manual turn control', () => {
  it('endUserTurn flushes the ASR while listening', async () => {
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({ providers: { asr: provider } as any });
    await session.start();
    await session.endUserTurn();
    expect(ctl.stop).toHaveBeenCalledTimes(1);
  });

  it('endUserTurn is a no-op when not listening', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start();
    await session.endUserTurn();
    expect(session.state).toBe('starting');
  });

  it('surfaces an error if flushing the ASR throws', async () => {
    const { provider, ctl } = controllableASR();
    ctl.stop = mock(async () => {
      throw new VoiceError({ code: 'asr_timeout', message: 'flush failed' });
    });
    const { session, events } = makeSession({ providers: { asr: provider } as any });
    await session.start();
    ctl.emitPartial({ text: 'x' }); // → user_speaking
    await session.endUserTurn();
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'asr_timeout')).toBe(
      true,
    );
  });
});

describe('VoiceSession error handling', () => {
  it('classifies browser playback failures separately from provider generation', async () => {
    const runtime = createMockRuntime({
      output: {
        failWith: {
          code: 'audio_playback_failed',
          message: 'HTMLAudioElement rejected playback',
        },
      },
    });
    const { session, events } = makeSession({ runtime });
    const errored = new Promise<void>((resolve) => session.once('error', () => resolve()));
    await session.start();
    emitChunk(runtime, 100);
    await errored;

    expect(events.find(([name]) => name === 'error')?.[1]).toMatchObject({
      code: 'audio_playback_failed',
      stage: 'playback',
      fatal: true,
      safeMessage: 'The generated audio could not be played.',
    });
  });

  it('fails when the ASR session cannot be created', async () => {
    const badAsr: ASRProvider = {
      name: 'bad_asr',
      capabilities: { streaming: true, batch: false, partialResults: false, languages: [] },
      createSession: async () => {
        throw new VoiceError({ code: 'asr_connection_failed', message: 'no socket' });
      },
    };
    const { session, events } = makeSession({ providers: { asr: badAsr } as any });
    await session.start();
    expect(session.state).toBe('error');
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'asr_connection_failed')).toBe(
      true,
    );
  });

  it('fails when the microphone cannot start', async () => {
    const input = new MockAudioInput();
    input.start = async () => {
      throw new VoiceError({ code: 'microphone_unavailable', message: 'denied' });
    };
    const runtime = { audioInput: input, audioOutput: new MockAudioOutput() };
    const { session, events } = makeSession({ runtime: runtime as any });
    await session.start();
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'microphone_unavailable')).toBe(
      true,
    );
  });

  it('fails when a streamed audio chunk rejects', async () => {
    const { provider, ctl } = controllableASR();
    ctl.sendImpl = () => Promise.reject(new VoiceError({ code: 'network_error', message: 'lost' }));
    const { session, runtime, events } = makeSession({ providers: { asr: provider } as any });
    await session.start();
    emitChunk(runtime, 100);
    await Promise.resolve();
    await Promise.resolve();
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'network_error')).toBe(true);
  });

  it('propagates an ASR error event', async () => {
    const { provider, ctl } = controllableASR();
    const { session, events } = makeSession({ providers: { asr: provider } as any });
    await session.start();
    ctl.emitError(new VoiceError({ code: 'asr_timeout', message: 'gone' }));
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'asr_timeout')).toBe(true);
  });

  it('propagates a microphone error event while listening', async () => {
    const { session, runtime, events } = makeSession();
    await session.start();
    runtime.audioInput.emitError({ code: 'microphone_unavailable', message: 'unplugged' });
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'microphone_unavailable')).toBe(
      true,
    );
  });

  it('fails when the audio-turn provider rejects', async () => {
    const badAudioLlm = createMockAudioLLM({
      failWith: { code: 'llm_failed', message: 'model down', retryable: false },
    });
    const { session, runtime, events } = makeSession({
      providers: { audioLlm: badAudioLlm } as any,
    });
    await session.start();
    const errored = new Promise<void>((r) => session.once('error', () => r()));
    emitChunk(runtime, 50);
    await errored;
    expect(session.state).toBe('error');
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'llm_failed')).toBe(true);
  });
});

describe('VoiceSession pause/resume', () => {
  it('pauses and resumes back to listening', async () => {
    const { session } = makeSession();
    await session.start();
    await session.pause();
    expect(session.state).toBe('paused');
    await session.resume();
    expect(session.state).toBe('listening');
  });

  it('pause is a no-op from a non-pausable state', async () => {
    const { session } = makeSession();
    await session.pause(); // still idle
    expect(session.state).toBe('idle');
  });

  it('resume is a no-op when not paused', async () => {
    const { session } = makeSession();
    await session.start();
    await session.resume(); // listening, not paused
    expect(session.state).toBe('listening');
  });
});

describe('VoiceSession finish/dispose', () => {
  it('finish emits usage then finished, and is idempotent', async () => {
    const { session, events } = makeSession();
    await session.start();
    await session.finish('done');
    expect(session.state).toBe('finished');
    const usageCount = events.filter(([n]) => n === 'usage').length;
    const finishedCount = events.filter(([n]) => n === 'finished').length;
    await session.finish(); // no-op
    expect(events.filter(([n]) => n === 'usage').length).toBe(usageCount);
    expect(events.filter(([n]) => n === 'finished').length).toBe(finishedCount);
  });

  it('finish is a no-op when finishing is not allowed', async () => {
    const { session, events } = makeSession();
    await session.finish(); // from idle → cannot finish
    expect(session.state).toBe('idle');
    expect(events.some(([n]) => n === 'finished')).toBe(false);
  });

  it('dispose tears down and silences further events; second dispose is a no-op', async () => {
    const { session, events } = makeSession();
    await session.start();
    await session.dispose();
    const before = events.length;
    await session.startListening(); // ignored (disposed)
    await session.dispose(); // no-op
    expect(events.length).toBe(before);
  });
});

describe('VoiceSession policies', () => {
  it('finishes when the session duration budget is exceeded', async () => {
    const c = clock(0);
    const { session, events } = makeSession({
      now: c.now,
      policy: { maxSessionDurationMs: 100 },
    });
    await session.start();
    c.set(1000); // exceed budget before the next turn is processed
    const finished = new Promise<void>((resolve) => session.once('finished', () => resolve()));
    emitChunk(runtime0(session), 100);
    await finished;
    expect(session.state).toBe('finished');
    const finishReason = events.find(
      ([n, p]) => n === 'statechange' && (p as any).to === 'finished',
    )?.[1] as any;
    expect(finishReason.reason).toBe('max_session_duration');
  });


});

describe('VoiceSession full_duplex', () => {
  function calibratePlaybackEcho(
    runtime: ReturnType<typeof createMockRuntime>,
    time: ReturnType<typeof clock>,
    endAt = 950,
  ) {
    for (let at = 0; at <= endAt; at += 50) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.06);
    }
  }


  it('opens the mic in full-duplex mode', async () => {
    const runtime = createMockRuntime();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
    });
    await session.start();
    expect(runtime.audioInput.started).toBe(true);
    expect(session.state).toBe('listening');
  });

  it('opens the mic during native audio LLM replies in full_duplex', async () => {
    const runtime = createMockRuntime();
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate() {
        return {
          text: '语音模型回复',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const speaking = nextState(session, 'assistant_speaking');
    await session.endUserTurn();
    await speaking;
    expect(runtime.audioInput.started).toBe(true);
  });

  it('keeps the WebM container header decodable across Audio LLM turns', async () => {
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    runtime.audioInput.suspendCapture = mock(async () => {});
    runtime.audioInput.resumeCapture = mock(async () => {});

    let asrSessionIndex = 0;
    const asr: ASRProvider = {
      name: 'turn-aware-asr',
      capabilities: {
        streaming: true,
        batch: true,
        partialResults: true,
        languages: ['auto'],
      },
      async createSession() {
        const text = asrSessionIndex++ === 0 ? 'first question' : 'second question';
        let finalCb: ((result: ASRResult) => void) | undefined;
        return {
          sendAudio() {},
          resetAudio() {},
          async stop() {
            finalCb?.({ text });
          },
          async close() {},
          onPartial() {
            return () => {};
          },
          onFinal(cb) {
            finalCb = cb;
            return () => {
              finalCb = undefined;
            };
          },
          onError() {
            return () => {};
          },
        };
      },
    };

    let releaseFirstReply!: () => void;
    const firstReplyGate = new Promise<void>((resolve) => {
      releaseFirstReply = resolve;
    });
    let firstReplyStarted!: () => void;
    const firstReplyStarting = new Promise<void>((resolve) => {
      firstReplyStarted = resolve;
    });
    let secondReplyStarted!: () => void;
    const secondReplyStarting = new Promise<void>((resolve) => {
      secondReplyStarted = resolve;
    });
    const audioInputs: number[][] = [];
    const audioLlm: AudioLLMProvider = {
      name: 'captured-audio-llm',
      async generate(input) {
        audioInputs.push([...new Uint8Array(input.audio)]);
        if (audioInputs.length === 1) {
          firstReplyStarted();
          await firstReplyGate;
        } else {
          secondReplyStarted();
        }
        return {
          text: `reply ${audioInputs.length}`,
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr, audioLlm } as any,
    });
    await session.start();

    const webmHeader = [0x1a, 0x45, 0xdf, 0xa3];
    runtime.audioInput.emitChunk({
      data: new Uint8Array(webmHeader).buffer,
      timestamp: 1,
      encoding: 'audio/webm;codecs=opus',
    });
    runtime.audioInput.emitChunk({
      data: new Uint8Array([1]).buffer,
      timestamp: 2,
      encoding: 'audio/webm;codecs=opus',
    });
    const firstEnding = session.endUserTurn();
    await firstReplyStarting;

    // The next recorder is already open while the first model request runs.
    // Its WebM header arrives before assistant playback resets buffered echo.
    runtime.audioInput.emitChunk({
      data: new Uint8Array(webmHeader).buffer,
      timestamp: 3,
      encoding: 'audio/webm;codecs=opus',
    });
    runtime.audioInput.emitChunk({
      data: new Uint8Array([8]).buffer,
      timestamp: 4,
      encoding: 'audio/webm;codecs=opus',
    });

    const firstAudioStarted = new Promise<void>((resolve) => {
      session.once('assistant_audio_start', () => resolve());
    });
    releaseFirstReply();
    await firstEnding;
    await firstAudioStarted;
    const listening = nextState(session, 'listening');
    runtime.audioOutput.fireEnd();
    await listening;

    // Android Chrome resumes normal listening with a newly started recorder.
    // Its EBML header replaces the pre-playback container rather than being
    // concatenated after it.
    runtime.audioInput.emitChunk({
      data: new Uint8Array(webmHeader).buffer,
      timestamp: 5,
      encoding: 'audio/webm;codecs=opus',
    });
    runtime.audioInput.emitChunk({
      data: new Uint8Array([9]).buffer,
      timestamp: 6,
      encoding: 'audio/webm;codecs=opus',
    });
    await session.endUserTurn();
    await secondReplyStarting;

    expect(audioInputs[0]).toEqual([...webmHeader, 1]);
    expect(audioInputs[1]).toEqual([...webmHeader, 9]);
    await session.dispose();
  });

  it('does not request an audio reply when speech resumes before caption ASR final', async () => {
    const runtime = createMockRuntime();
    let sessionCount = 0;
    let releaseFirstAsr!: () => void;
    const firstAsrGate = new Promise<void>((resolve) => {
      releaseFirstAsr = resolve;
    });
    const asr: ASRProvider = {
      name: 'slow-batch-asr',
      capabilities: {
        streaming: false,
        batch: true,
        partialResults: false,
        languages: ['auto'],
      },
      async createSession() {
        const index = sessionCount++;
        let finalCb: ((result: ASRResult) => void) | undefined;
        return {
          sendAudio() {},
          async stop() {
            if (index === 0) {
              await firstAsrGate;
              finalCb?.({ text: 'first question' });
            } else if (index === 1) {
              finalCb?.({ text: 'continued question' });
            }
          },
          async close() {},
          onPartial() {
            return () => {};
          },
          onFinal(cb) {
            finalCb = cb;
            return () => {
              finalCb = undefined;
            };
          },
          onError() {
            return () => {};
          },
        };
      },
    };
    let audioLlmCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'slow-audio-llm',
      async generate() {
        audioLlmCalls += 1;
        return {
          text: 'continued reply',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr, audioLlm } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
    });
    await session.start();
    emitChunk(runtime);

    const processing = nextState(session, 'processing');
    const ending = session.endUserTurn();
    await processing;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(session.state).toBe('processing');
    expect(sessionCount).toBe(2);
    expect(runtime.audioInput.started).toBe(true);
    expect(audioLlmCalls).toBe(0);

    // Speaking while the old turn is still awaiting final ASR cancels it and
    // belongs to the recorder that was already opened during processing.
    runtime.audioInput.emitVolume(0.5);
    expect(session.state).toBe('user_speaking');

    emitChunk(runtime);
    const continuedReply = new Promise<void>((resolve) => {
      const off = session.on('assistant_text', ({ text }) => {
        if (text !== 'continued reply') return;
        off();
        resolve();
      });
    });
    const secondEnding = session.endUserTurn();

    releaseFirstAsr();
    await ending;
    await secondEnding;
    await continuedReply;

    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' &&
          (payload as { text: string }).text === 'stale reply',
      ),
    ).toBe(false);
    expect(audioLlmCalls).toBe(1);
    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' &&
          (payload as { text: string }).text === 'continued reply',
      ),
    ).toBe(true);
    await session.dispose();
  });

  it('uses the native audio reply even when caption ASR returns empty text', async () => {
    const runtime = createMockRuntime();
    let finalCb: ((result: ASRResult) => void) | undefined;
    const asr: ASRProvider = {
      name: 'empty-caption-asr',
      capabilities: {
        streaming: false,
        batch: true,
        partialResults: false,
        languages: ['auto'],
      },
      async createSession() {
        return {
          sendAudio() {},
          async stop() {
            finalCb?.({ text: '' });
          },
          async close() {},
          onPartial() {
            return () => {};
          },
          onFinal(cb) {
            finalCb = cb;
            return () => {
              finalCb = undefined;
            };
          },
          onError() {
            return () => {};
          },
        };
      },
    };
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate() {
        return {
          text: 'I still understood the audio',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr, audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const assistantText = new Promise<void>((resolve) => {
      session.once('assistant_text', () => resolve());
    });
    await session.endUserTurn();
    await assistantText;

    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' &&
          (payload as { text: string }).text === 'I still understood the audio',
      ),
    ).toBe(true);
    await session.dispose();
  });

  it('treats ASR partials as UI-only and requests one audio reply after final', async () => {
    const runtime = createMockRuntime();
    const { provider: asr, ctl } = controllableASR({
      finalOnStop: 'complete question',
    });
    let audioLlmCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'counted-audio-llm',
      async generate() {
        audioLlmCalls += 1;
        return {
          text: 'one answer',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr, audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);

    ctl.emitPartial({ text: 'complete' });
    ctl.emitPartial({ text: 'complete question' });
    await Promise.resolve();
    expect(audioLlmCalls).toBe(0);

    const answered = new Promise<void>((resolve) => {
      const off = session.on('assistant_text', ({ text }) => {
        if (text !== 'one answer') return;
        off();
        resolve();
      });
    });
    await session.endUserTurn();
    await answered;

    expect(audioLlmCalls).toBe(1);
    await session.dispose();
  });

  it('can disable ASR partials without disabling the final transcript', async () => {
    const { provider: asr, ctl } = controllableASR({
      finalOnStop: 'authoritative final',
    });
    const { session, events } = makeSession({
      asrPartial: false,
      providers: { asr } as any,
    });
    await session.start();

    ctl.emitPartial({ text: '' });
    ctl.emitPartial({ text: 'provisional text' });

    expect(ctl.options?.interimResults).toBe(false);
    expect(events.some(([name]) => name === 'asr_partial')).toBe(false);

    const finalReceived = new Promise<void>((resolve) => {
      session.once('asr_final', () => resolve());
    });
    await session.endUserTurn();
    await finalReceived;
    expect(
      events.some(
        ([name, payload]) =>
          name === 'asr_final' &&
          (payload as { text: string }).text === 'authoritative final',
      ),
    ).toBe(true);
    await session.dispose();
  });

  it('defers batch-backed interim work until VAD confirms speech', async () => {
    const { provider: asr, ctl } = controllableASR();
    const { session, runtime } = makeSession({
      providers: { asr } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        volumeThreshold: 0.02,
      },
    });
    await session.start();

    expect(ctl.interimResultsEnabled).toEqual([false]);
    runtime.audioInput.emitVolume(0.1);
    expect(ctl.interimResultsEnabled).toEqual([false, true]);

    await session.dispose();
  });

  it('uses an ASR partial to rescue quiet speech in hybrid detection', async () => {
    const time = clock(0);
    const { provider: asr, ctl } = controllableASR({
      finalOnStop: 'quiet but confirmed',
    });
    const { session, runtime } = makeSession({
      now: time.now,
      providers: { asr } as any,
      turnDetection: {
        strategy: 'hybrid',
        minSpeechMs: 180,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.5,
      },
    });
    await session.start();

    expect(ctl.options?.interimResults).toBe(true);
    expect(ctl.interimResultsEnabled).toEqual([]);
    ctl.emitPartial({ text: 'quiet speech' });
    expect(session.state).toBe('user_speaking');

    time.set(500);
    runtime.audioInput.emitVolume(0.01);
    time.set(1_000);
    runtime.audioInput.emitVolume(0.01);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(ctl.stop).toHaveBeenCalledTimes(1);
    await session.dispose();
  });

  it('aborts a final-confirmed provider request when a newer turn supersedes it', async () => {
    const runtime = createMockRuntime();
    const { provider: asr } = controllableASR({ finalOnStop: 'first question' });
    let started!: () => void;
    const requestStarted = new Promise<void>((resolve) => {
      started = resolve;
    });
    let requestSignal: AbortSignal | undefined;
    let emitLateTranscriptDelta:
      | ((text: string) => void | Promise<void>)
      | undefined;
    const audioLlm: AudioLLMProvider = {
      name: 'abortable-audio-llm',
      generate(input) {
        requestSignal = input.signal;
        emitLateTranscriptDelta = input.onTranscriptDelta;
        started();
        return new Promise((_, reject) => {
          input.signal?.addEventListener('abort', () => reject(new Error('aborted')));
        });
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr, audioLlm } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
    });
    await session.start();
    emitChunk(runtime);
    await session.endUserTurn();
    await requestStarted;

    expect(requestSignal?.aborted).toBe(false);
    runtime.audioInput.emitVolume(0.5);
    expect(session.state).toBe('user_speaking');
    expect(requestSignal?.aborted).toBe(true);
    await emitLateTranscriptDelta?.('late stale answer');
    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text_delta' &&
          (payload as { text: string }).text.includes('late stale answer'),
      ),
    ).toBe(false);

    await session.dispose();
  });

  it('can request and stream an audio reply before caption ASR final', async () => {
    const runtime = createMockRuntime();
    const streamedChunks: number[][] = [];
    const startPcmStream = mock(async () => ({
      async write(data: ArrayBuffer) {
        streamedChunks.push([...new Uint8Array(data)]);
      },
      async close() {},
    }));
    runtime.audioOutput.startPcmStream = startPcmStream;

    let releaseAsr!: () => void;
    const asrGate = new Promise<void>((resolve) => {
      releaseAsr = resolve;
    });
    const asr: ASRProvider = {
      name: 'slow-caption-asr',
      capabilities: {
        streaming: false,
        batch: true,
        partialResults: false,
        languages: ['auto'],
      },
      async createSession() {
        let finalCb: ((result: ASRResult) => void) | undefined;
        return {
          sendAudio() {},
          async stop() {
            await asrGate;
            finalCb?.({ text: 'stream this reply' });
          },
          async close() {},
          onPartial() {
            return () => {};
          },
          onFinal(cb) {
            finalCb = cb;
            return () => {
              finalCb = undefined;
            };
          },
          onError() {
            return () => {};
          },
        };
      },
    };

    let releaseReply!: () => void;
    const replyGate = new Promise<void>((resolve) => {
      releaseReply = resolve;
    });
    let announceFirstChunk!: () => void;
    const firstChunk = new Promise<void>((resolve) => {
      announceFirstChunk = resolve;
    });
    const audioLlm: AudioLLMProvider = {
      name: 'streaming-audio-llm',
      async generate(input) {
        audioLlmStarted = true;
        await input.onAudioChunk?.({
          data: new Uint8Array([1, 2, 3, 4]).buffer,
          encoding: 'pcm_s16le',
          sampleRate: 24_000,
          channels: 1,
        });
        await input.onTranscriptDelta?.('streamed ');
        announceFirstChunk();
        await replyGate;
        await input.onAudioChunk?.({
          data: new Uint8Array([5, 6]).buffer,
          encoding: 'pcm_s16le',
          sampleRate: 24_000,
          channels: 1,
        });
        await input.onTranscriptDelta?.('reply');
        return {
          text: 'streamed reply',
          audioBuffer: new ArrayBuffer(50),
          mimeType: 'audio/wav',
        };
      },
    };
    let audioLlmStarted = false;
    const { session, events } = makeSession({
      mode: 'full_duplex',
      audioLlmStartTiming: 'after_audio',
      runtime,
      providers: { asr, audioLlm } as any,
    });
    await session.start();
    emitChunk(runtime);
    const ending = session.endUserTurn();

    await firstChunk;

    expect(audioLlmStarted).toBe(true);
    expect(session.state).toBe('assistant_speaking');
    expect(streamedChunks).toEqual([[1, 2, 3, 4]]);
    expect(events).toContainEqual([
      'assistant_text_delta',
      expect.objectContaining({ delta: 'streamed ', text: 'streamed ' }),
    ]);
    expect(events.some(([name]) => name === 'assistant_text')).toBe(false);
    expect(runtime.audioOutput.played).toHaveLength(0);

    releaseAsr();
    releaseReply();
    await ending;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(streamedChunks).toEqual([[1, 2, 3, 4], [5, 6]]);
    expect(startPcmStream).toHaveBeenCalledTimes(1);
    const transcriptDeltas = events
      .filter(([name]) => name === 'assistant_text_delta')
      .map(([, payload]) => payload as { text: string; turnId: string });
    expect(transcriptDeltas.map(({ text }) => text)).toEqual(['streamed ', 'streamed reply']);
    expect(
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' &&
          (payload as { text: string }).text === 'streamed reply',
      ),
    ).toBe(true);
    const finalAssistant = events.find(
      ([name, payload]) =>
        name === 'assistant_text' &&
        (payload as { text: string }).text === 'streamed reply',
    )?.[1] as { turnId: string };
    expect(transcriptDeltas.at(-1)?.turnId).toBe(finalAssistant.turnId);
    await session.dispose();
  });


});

describe('VoiceSession volume-driven turn detection', () => {
  it('opens and closes a user turn from volume samples', async () => {
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      providers: { asr: provider } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
    });
    await session.start();
    runtime0(session); // noop accessor
    const input = (session as any).config.runtime.audioInput as MockAudioInput;
    input.emitVolume(0.5); // speech_start → user_speaking
    expect(session.state).toBe('user_speaking');
    input.emitVolume(0.0); // speech_end → endUserTurn flushes ASR
    await Promise.resolve();
    expect(ctl.stop).toHaveBeenCalled();
  });

  it('ignores volume in push-to-talk mode', async () => {
    const { session, runtime } = makeSession({ mode: 'push_to_talk' });
    await session.start();
    runtime.audioInput.emitVolume(0.9);
    expect(session.state).toBe('listening');
  });
});

// Accessor used by a few tests to reach the harness runtime via the session.
function runtime0(session: VoiceSession): ReturnType<typeof createMockRuntime> {
  return (session as any).config.runtime;
}
