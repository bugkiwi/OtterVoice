import { beforeEach, describe, expect, it, mock } from 'bun:test';
import { createVoiceSession, VoiceSession } from '../src/session';
import { VoiceError } from '../src/errors';
import {
  createMockASR,
  createMockLLM,
  createMockTTS,
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
  NormalizedVoiceError,
  TTSProvider,
  VoiceAgentPlugin,
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
  const providers = {
    asr: createMockASR({ transcripts: ['hello there', 'second turn', 'third'] }),
    llm: createMockLLM({ reply: () => 'assistant reply' }),
    tts: createMockTTS(),
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
    'assistant_text',
    'assistant_audio_start',
    'assistant_audio_end',
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
function controllableASR(options: { finalOnStop?: string } = {}) {
  let partialCb: ((r: ASRResult) => void) | undefined;
  let finalCb: ((r: ASRResult) => void) | undefined;
  let errorCb: ((e: NormalizedVoiceError) => void) | undefined;
  const ctl = {
    sendImpl: undefined as undefined | (() => unknown),
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
      batch: false,
      partialResults: true,
      languages: ['en'],
    },
    async createSession() {
      return {
        sendAudio: () => ctl.sendImpl?.(),
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
  it('start() rejects unless idle', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start('hi');
    await expect(session.start('again')).rejects.toBeInstanceOf(VoiceError);
  });

  it('speaks the opener then opens the mic', async () => {
    const { session, events } = makeSession();
    await session.start('Good morning.');
    const states = events
      .filter(([n]) => n === 'statechange')
      .map(([, p]) => (p as { to: string }).to);
    expect(states).toEqual(['starting', 'assistant_speaking', 'listening']);
    expect(events.some(([n, p]) => n === 'assistant_text' && (p as any).text === 'Good morning.')).toBe(
      true,
    );
    expect(session.state).toBe('listening');
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

  it('starts without an opener when none is given', async () => {
    const { session, events } = makeSession();
    await session.start();
    expect(events.some(([n]) => n === 'assistant_text')).toBe(false);
    expect(session.state).toBe('listening');
  });

  it('does not auto-listen when policy disables it', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start('hi');
    expect(session.state).toBe('assistant_speaking');
  });

  it('emits an error if the opener fails to synthesize', async () => {
    const failTts: TTSProvider = {
      name: 'bad_tts',
      capabilities: { streaming: false, voices: [], formats: ['mp3'], languages: ['en'] },
      synthesize: async () => {
        throw new VoiceError({ code: 'tts_failed', message: 'no synth' });
      },
    };
    const { session, events } = makeSession({ providers: { tts: failTts } as any });
    await session.start('hi');
    expect(session.state).toBe('error');
    expect(events.some(([n, p]) => n === 'error' && (p as any).code === 'tts_failed')).toBe(true);
  });
});

describe('VoiceSession turn loop', () => {
  it('runs native audio LLM output while keeping ASR for the user transcript', async () => {
    let audioCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate(input) {
        audioCalls += 1;
        expect(input.audio.byteLength).toBe(4);
        expect(input.format).toBe('webm');
        return {
          text: '语音模型回复',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, runtime, events } = makeSession({
      pipeline: 'audio_llm',
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
      events.some(
        ([name, payload]) =>
          name === 'assistant_text' && (payload as { text: string }).text === '语音模型回复',
      ),
    ).toBe(true);
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
      pipeline: 'audio_llm',
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
    await session.start('Tell me about your day.');

    const back = nextState(session, 'listening');
    emitChunk(runtime, 1200);
    await back;

    const turns = session.getTurns();
    expect(turns.map((t) => t.role)).toEqual(['assistant', 'user', 'assistant']);
    expect(turns[1]?.text).toBe('hello there');

    const usage = session.getUsage();
    expect(usage.asrAudioMs).toBe(1200);
    expect(usage.llmInputTokens).toBe(10);
    expect(usage.assistantSpeechChars).toBeGreaterThan(0);

    // partial + final + audio events fired
    expect(events.some(([n]) => n === 'asr_partial')).toBe(true);
    expect(events.some(([n]) => n === 'asr_final')).toBe(true);
    expect(events.some(([n]) => n === 'assistant_audio_start')).toBe(true);
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

  it('accepts injected user text (submitUserText)', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start('opener');
    await session.submitUserText('typed message');
    const turns = session.getTurns();
    expect(turns.map((t) => t.text)).toEqual(['opener', 'typed message', 'assistant reply']);
  });

  it('re-listens on an empty final without calling the LLM', async () => {
    const llm = createMockLLM();
    const generate = mock(llm.generate.bind(llm));
    llm.generate = generate;
    const { session } = makeSession({ providers: { llm } as any });
    await session.start('opener');
    await session.submitUserText('   '); // whitespace → empty
    expect(session.state).toBe('listening');
    expect(generate).not.toHaveBeenCalled();
    expect(session.getTurns()).toHaveLength(1); // just the opener
  });

  it('speaks without audio when no TTS provider is configured', async () => {
    const { session, runtime, events } = makeSession({
      providers: { tts: undefined } as any,
    });
    await session.start('no audio opener');
    expect(events.some(([n]) => n === 'assistant_text')).toBe(true);
    expect(events.some(([n]) => n === 'assistant_audio_start')).toBe(false);
    expect(runtime.audioOutput.played).toHaveLength(0);
  });

  it('plays via audioUrl when the TTS returns one', async () => {
    const urlTts: TTSProvider = {
      name: 'url_tts',
      capabilities: { streaming: false, voices: [], formats: ['mp3'], languages: ['en'] },
      synthesize: async () => ({ audioUrl: 'http://audio/x.mp3', mimeType: 'audio/mp3' }),
    };
    const { session, runtime } = makeSession({ providers: { tts: urlTts } as any });
    await session.start('hi');
    expect(runtime.audioOutput.played[0]?.audioUrl).toBe('http://audio/x.mp3');
  });
});

describe('VoiceSession turn-id generation', () => {
  it('lazily generates a user turn id when listening never set one', async () => {
    const { session } = makeSession({ policy: { autoStartListening: false } });
    await session.start('opener'); // state assistant_speaking, no active user turn id
    await session.submitUserText('hello');
    const userTurn = session.getTurns().find((t) => t.role === 'user');
    expect(userTurn?.id).toBeTruthy();
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
    await session.start('opener'); // assistant_speaking
    await session.endUserTurn();
    expect(session.state).toBe('assistant_speaking');
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

  it('fails when the LLM rejects', async () => {
    const badLlm = createMockLLM({
      failWith: { code: 'llm_failed', message: 'model down', retryable: false },
    });
    const { session, runtime, events } = makeSession({ providers: { llm: badLlm } as any });
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

describe('VoiceSession policies & agent', () => {
  it('finishes when the session duration budget is exceeded', async () => {
    const c = clock(0);
    const { session, events } = makeSession({
      now: c.now,
      policy: { maxSessionDurationMs: 100 },
    });
    await session.start();
    c.set(1000); // exceed budget before the next turn is processed
    await session.submitUserText('hello');
    expect(session.state).toBe('finished');
    const finishReason = events.find(
      ([n, p]) => n === 'statechange' && (p as any).to === 'finished',
    )?.[1] as any;
    expect(finishReason.reason).toBe('max_session_duration');
  });

  it('drives the conversation through an agent plugin', async () => {
    const agent: VoiceAgentPlugin = {
      getInitialAssistantMessage: async () => 'Agent opener',
      generateNextAssistantMessage: async ({ lastUserText }) => `Echo: ${lastUserText}`,
      shouldFinishSession: ({ turns }) => turns.length >= 4,
    };
    const { session, events } = makeSession({ agent });
    await session.start();
    expect(events.some(([n, p]) => n === 'assistant_text' && (p as any).text === 'Agent opener')).toBe(
      true,
    );

    const back = nextState(session, 'listening');
    emitChunk(runtime0(session));
    await back;
    expect(
      events.some(([n, p]) => n === 'assistant_text' && (p as any).text === 'Echo: hello there'),
    ).toBe(true);

    // second turn pushes turns to >= 4 → agent finishes the session
    const finished = new Promise<void>((r) => session.once('finished', () => r()));
    emitChunk(runtime0(session));
    await finished;
    expect(session.state).toBe('finished');
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

  it('subtracts synchronized assistant playback echo before barge-in detection', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      interruptionDetection: {
        minSpeechMs: 300,
        silenceTimeoutMs: 300,
        volumeThreshold: 0.015,
      },
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time);
    time.set(400);
    runtime.audioInput.emitVolume(0.02);
    expect(session.state).toBe('assistant_speaking');

    for (const at of [1_000, 1_050, 1_100, 1_150]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.08);
    }
    expect(runtime.audioOutput.paused).toBe(1);
    time.set(1_800);
    ctl.emitPartial({ text: '停一下' });
    expect(session.state).toBe('user_speaking');
  });

  it('uses stricter sustained-speech detection for barge-in than normal listening', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      interruptionDetection: {
        minSpeechMs: 500,
        silenceTimeoutMs: 300,
        volumeThreshold: 0.2,
      },
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    // A short, loud tap is ignored.
    runtime.audioInput.emitVolume(0.8);
    time.set(100);
    runtime.audioInput.emitVolume(0);
    expect(session.state).toBe('assistant_speaking');
    expect(runtime.audioOutput.stopped).toBe(0);

    // The asynchronously decoded playback reference becomes available, then
    // receives enough echo-only frames to finish calibration.
    calibratePlaybackEcho(runtime, time);

    // Sustained loudness still behaves as an intentional spoken interruption.
    for (const at of [1_000, 1_050, 1_100, 1_150]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.4);
    }
    expect(runtime.audioOutput.paused).toBe(1);
    time.set(1_800);
    ctl.emitPartial({ text: '停一下' });
    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);
  });

  it('confirms a strong 200 ms interruption without waiting for ASR text', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      interruptionDetection: {
        minSpeechMs: 200,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.018,
      },
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }

    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);
    expect(runtime.audioOutput.paused).toBe(0);
  });

  it('accepts a single CJK character as a confirmed interruption', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      interruptionDetection: {
        minSpeechMs: 500,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.018,
      },
      policy: { allowInterruption: true, interruptionTailIgnoreMs: 200 },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);

    time.set(800);
    ctl.emitPartial({ text: '停' });
    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);
  });

  it('accepts a short English word as a confirmed interruption', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      interruptionDetection: {
        minSpeechMs: 500,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.018,
      },
      policy: { allowInterruption: true, interruptionTailIgnoreMs: 200 },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);

    time.set(800);
    ctl.emitPartial({ text: 'no' });
    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);
  });

  it('keeps the mic open while the assistant speaks', async () => {
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
    await session.start('Welcome.');
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
      pipeline: 'audio_llm',
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

  it('reopens capture while caption ASR and the audio reply are still pending', async () => {
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
    let releaseReply!: (value: {
      text: string;
      audioBuffer: ArrayBuffer;
      mimeType: string;
    }) => void;
    const replyGate = new Promise<{
      text: string;
      audioBuffer: ArrayBuffer;
      mimeType: string;
    }>((resolve) => {
      releaseReply = resolve;
    });
    let audioLlmCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'slow-audio-llm',
      async generate() {
        audioLlmCalls += 1;
        if (audioLlmCalls === 1) return replyGate;
        return {
          text: 'continued reply',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      pipeline: 'audio_llm',
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

    // Speaking during the old request cancels its reply and belongs to the
    // recorder that was already opened during processing.
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
    releaseReply({
      text: 'stale reply',
      audioBuffer: new ArrayBuffer(8),
      mimeType: 'audio/wav',
    });
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
    expect(audioLlmCalls).toBe(2);
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
      pipeline: 'audio_llm',
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

  it('does not answer an empty short interruption caused by playback residual', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const asr: ASRProvider = {
      name: 'empty-interruption-caption-asr',
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
    let audioLlmCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate() {
        audioLlmCalls += 1;
        return {
          text: 'duplicate reply',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      pipeline: 'audio_llm',
      runtime,
      now: time.now,
      providers: { asr, audioLlm } as any,
      interruptionDetection: {
        minSpeechMs: 200,
        silenceTimeoutMs: 450,
        volumeThreshold: 0.018,
      },
      policy: { allowInterruption: true },
    });
    const speaking = nextState(session, 'assistant_speaking');
    void session.start('Welcome');
    await speaking;
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(session.state).toBe('user_speaking');
    emitChunk(runtime);

    const listening = nextState(session, 'listening');
    time.set(600);
    runtime.audioInput.emitVolume(0);
    time.set(1_050);
    runtime.audioInput.emitVolume(0);
    await listening;

    expect(audioLlmCalls).toBe(0);
    expect(
      events.filter(([name]) => name === 'assistant_text'),
    ).toHaveLength(1);
    await session.dispose();
  });

  it('rearms VAD after playback before accepting a new user turn', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    let audioLlmCalls = 0;
    const audioLlm: AudioLLMProvider = {
      name: 'audio-llm',
      async generate() {
        audioLlmCalls += 1;
        return {
          text: 'duplicate reply',
          audioBuffer: new ArrayBuffer(8),
          mimeType: 'audio/wav',
        };
      },
    };
    const { session, events } = makeSession({
      mode: 'full_duplex',
      pipeline: 'audio_llm',
      runtime,
      now: time.now,
      providers: { audioLlm } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 200,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.02,
      },
      policy: { postPlaybackVadRearmMs: 300 },
    });
    const speaking = nextState(session, 'assistant_speaking');
    void session.start('Welcome');
    await speaking;
    await new Promise((resolve) => setTimeout(resolve, 0));
    const listening = nextState(session, 'listening');
    runtime.audioOutput.fireEnd();
    await listening;

    // A lingering 300 ms playback tail used to look like a fresh user turn.
    for (const at of [50, 100, 150, 200, 250, 300]) {
      time.set(at);
      runtime.audioInput.emitVolume(0.08);
    }
    time.set(350);
    runtime.audioInput.emitVolume(0);

    expect(session.state).toBe('listening');
    expect(audioLlmCalls).toBe(0);
    expect(events.some(([name]) => name === 'user_audio_end')).toBe(false);
    await session.dispose();
  });

  it('preserves the first WebM header for ASR while filtering assistant audio', async () => {
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    let finalCb: ((result: ASRResult) => void) | undefined;
    const sessions: number[][][] = [];
    const asr: ASRProvider = {
      name: 'header-aware-asr',
      capabilities: {
        streaming: false,
        batch: true,
        partialResults: false,
        languages: ['auto'],
      },
      async createSession() {
        const sent: number[][] = [];
        sessions.push(sent);
        return {
          sendAudio(audio) {
            sent.push([...new Uint8Array(audio)]);
          },
          resetAudio() {
            const header = sent[0];
            sent.length = 0;
            if (header) sent.push(header);
          },
          async stop() {
            finalCb?.({ text: 'done' });
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
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      providers: { asr } as any,
    });
    const assistantAudioStarted = new Promise<void>((resolve) => {
      session.once('assistant_audio_start', () => resolve());
    });
    void session.start('Welcome');
    await assistantAudioStarted;
    expect(session.state).toBe('assistant_speaking');

    runtime.audioInput.emitChunk({
      data: new Uint8Array([1]).buffer,
      timestamp: 1,
      encoding: 'audio/webm;codecs=opus',
    });
    runtime.audioInput.emitChunk({
      data: new Uint8Array([2]).buffer,
      timestamp: 2,
      encoding: 'audio/webm;codecs=opus',
    });
    expect(sessions.at(-1)).toEqual([[1]]);
    await session.dispose();
  });

  it('suspends encoded capture during assistant playback and resumes for listening', async () => {
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const suspendCapture = mock(async () => {});
    const resumeCapture = mock(async () => {});
    runtime.audioInput.suspendCapture = suspendCapture;
    runtime.audioInput.resumeCapture = resumeCapture;
    const { session } = makeSession({ mode: 'full_duplex', runtime });
    const assistantAudioStarted = new Promise<void>((resolve) => {
      session.once('assistant_audio_start', () => resolve());
    });
    void session.start('Welcome');
    await assistantAudioStarted;
    expect(suspendCapture).toHaveBeenCalledTimes(1);
    expect(resumeCapture).not.toHaveBeenCalled();

    const listening = nextState(session, 'listening');
    runtime.audioOutput.fireEnd();
    await listening;
    expect(resumeCapture).toHaveBeenCalledTimes(1);
    await session.dispose();
  });

  it('returns to listening when full-duplex has no TTS provider', async () => {
    const { session } = makeSession({
      mode: 'full_duplex',
      providers: { tts: undefined } as any,
    });
    await session.start('Welcome.');
    expect(session.state).toBe('listening');
  });

  it('barge-in stops playback and processes the new user turn', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR({ finalOnStop: 'wait actually' });
    const { session, events } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: {
        asr: provider,
        llm: createMockLLM({
          reply: (input) => `Echo: ${input.messages.at(-1)?.content ?? ''}`,
        }),
      } as any,
      turnDetection: {
        strategy: 'volume',
        minSpeechMs: 0,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
      interruptionDetection: {
        minSpeechMs: 500,
        silenceTimeoutMs: 0,
        volumeThreshold: 0.1,
      },
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((r) => setTimeout(r, 0));

    expect(runtime.audioOutput.played).toHaveLength(1);

    calibratePlaybackEcho(runtime, time, 350);
    for (let frame = 0; frame < 4; frame += 1) {
      time.set(400 + frame * 50);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5); // speech-shaped barge-in
    }
    expect(runtime.audioOutput.paused).toBe(1);
    time.set(1_600);
    ctl.emitPartial({ text: 'wait actually' });
    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);

    time.set(850);
    runtime.audioInput.emitVolume(0.0); // end barge-in turn
    await nextState(session, 'assistant_speaking');

    expect(
      events.some(
        ([n, p]) => n === 'asr_final' && (p as { text: string }).text === 'wait actually',
      ),
    ).toBe(true);
    expect(
      events.some(
        ([n, p]) =>
          n === 'assistant_text' &&
          (p as { text: string }).text.includes('wait actually'),
      ),
    ).toBe(true);
  });

  it('does not confirm a tentative interruption from loudspeaker echo tail alone', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      interruptionDetection: { volumeThreshold: 0.02 },
      policy: { allowInterruption: true, falseInterruptionSilenceMs: 250 },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);

    for (const at of [1_200, 1_250, 1_300, 1_350]) {
      time.set(at);
      runtime.audioInput.emitVolume(0.04);
    }
    expect(session.state).toBe('assistant_speaking');
    expect(runtime.audioOutput.stopped).toBe(0);
  });

  it('does not confirm a tentative interruption from assistant echo ASR', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);

    time.set(1_200);
    ctl.emitPartial({ text: 'assistant reply' });
    expect(session.state).toBe('assistant_speaking');
    expect(runtime.audioOutput.stopped).toBe(0);
  });

  it('resumes playback when a tentative interruption disappears after pausing', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      interruptionDetection: { volumeThreshold: 0.02 },
      policy: {
        allowInterruption: true,
        falseInterruptionSilenceMs: 400,
      },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);
    expect(session.state).toBe('assistant_speaking');

    time.set(1_200);
    runtime.audioInput.emitVolume(0);
    time.set(1_700);
    runtime.audioInput.emitVolume(0);

    expect(runtime.audioOutput.resumed).toBe(1);
    expect(runtime.audioOutput.stopped).toBe(0);
    expect(session.state).toBe('assistant_speaking');
  });

  it('ignores assistant echo transcripts and uses meaningful text to confirm a candidate', async () => {
    const time = clock(0);
    const runtime = createMockRuntime({ output: { autoComplete: false } });
    const { provider, ctl } = controllableASR();
    const { session } = makeSession({
      mode: 'full_duplex',
      runtime,
      now: time.now,
      providers: { asr: provider } as any,
      policy: { allowInterruption: true },
    });
    await session.start();
    void session.submitUserText('hello');
    await nextState(session, 'assistant_speaking');
    await new Promise((resolve) => setTimeout(resolve, 0));

    ctl.emitPartial({ text: 'assistant echo words' });
    expect(session.state).toBe('assistant_speaking');

    calibratePlaybackEcho(runtime, time, 350);
    for (const at of [400, 450, 500, 550]) {
      time.set(at);
      runtime.audioOutput.emitVolume(0.1);
      runtime.audioInput.emitVolume(0.5);
    }
    expect(runtime.audioOutput.paused).toBe(1);

    time.set(1_600);
    ctl.emitPartial({ text: '等等' });
    expect(session.state).toBe('user_speaking');
    expect(runtime.audioOutput.stopped).toBeGreaterThan(0);
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
