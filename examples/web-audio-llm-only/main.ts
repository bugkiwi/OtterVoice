import { createOtterVoiceSession, type VoiceSession } from '@ottervoice/core';
import {
  createOpenRouterASR,
  createOpenRouterAudioLLM,
} from '@ottervoice/provider-openrouter';
import {
  createWebRuntime,
  prepareBrowserAudio,
} from '@ottervoice/runtime-web';

const startButton = document.querySelector<HTMLButtonElement>('#start')!;
const finishButton = document.querySelector<HTMLButtonElement>('#finish')!;
const status = document.querySelector<HTMLElement>('#status')!;
const history = document.querySelector<HTMLUListElement>('#history')!;
let session: VoiceSession | undefined;
const rows = new Map<string, HTMLLIElement>();

function upsert(turnId: string, role: string, text: string): void {
  let row = rows.get(turnId);
  if (!row) {
    row = document.createElement('li');
    rows.set(turnId, row);
    history.append(row);
  }
  row.textContent = `${role}: ${text}`;
}

startButton.addEventListener('click', async () => {
  startButton.disabled = true;
  const runtime = createWebRuntime({
    mimeType: 'audio/webm;codecs=opus',
    timesliceMs: 100,
    volumePollMs: 50,
  });
  const gateway = {
    // The server ignores this placeholder and injects its own provider key.
    apiKey: 'same-origin-gateway',
    baseUrl: `${location.origin}/api/voice`,
    requestStage: 'gateway' as const,
  };
  session = createOtterVoiceSession({
    mode: 'full_duplex',
    pipeline: 'audio_llm',
    runtime,
    audioLlmSystemPrompt: 'Reply naturally in one or two short spoken sentences.',
    audioLlmRetry: {
      maxAttempts: 2,
      backoffMs: 300,
      continueSessionOnFailure: true,
    },
    providers: {
      asr: createOpenRouterASR({
        ...gateway,
        model: 'qwen/qwen3-asr-flash-2026-02-10',
        format: 'webm',
      }),
      audioLlm: createOpenRouterAudioLLM({
        ...gateway,
        model: 'openai/gpt-audio-mini',
        voice: 'alloy',
        requireDoneSentinel: true,
        prepareAudio: (audio, format) => prepareBrowserAudio(audio, format, {
          sampleRate: 16_000,
          maxDurationMs: 60_000,
        }),
      }),
    },
    turnDetection: {
      strategy: 'hybrid',
      minSpeechMs: 180,
      silenceTimeoutMs: 700,
      maxTurnMs: 60_000,
      volumeThreshold: 0.025,
    },
    policy: { allowInterruption: true },
  });

  session.on('statechange', ({ to }) => { status.textContent = to; });
  session.on('asr_partial', ({ turnId, text }) => upsert(turnId, 'you', text));
  session.on('asr_final', ({ turnId, text }) => upsert(turnId, 'you', text));
  session.on('assistant_text_delta', ({ turnId, text }) => upsert(turnId, 'assistant', text));
  session.on('assistant_text', ({ turnId, text }) => upsert(turnId, 'assistant', text));
  session.on('user_audio_final', ({ turnId, audio, format }) => {
    console.info('archive user turn', { turnId, bytes: audio.byteLength, format });
  });
  session.on('assistant_audio', ({ turnId, audio, mimeType }) => {
    console.info('archive assistant turn', { turnId, bytes: audio?.byteLength, mimeType });
  });
  session.on('error', ({ safeMessage, fatal }) => {
    status.textContent = `${fatal ? 'Fatal' : 'Recoverable'}: ${safeMessage}`;
  });

  try {
    await runtime.audioOutput.unlock?.();
  } catch (error) {
    console.warn('Playback unlock failed; microphone capture will still start.', error);
  }
  await session.start();
  finishButton.disabled = false;
});

finishButton.addEventListener('click', async () => {
  finishButton.disabled = true;
  await session?.finish('user_finished');
  await session?.dispose();
  session = undefined;
  startButton.disabled = false;
});
