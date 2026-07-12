/**
 * Web demo entry. Uses the real browser runtime (getUserMedia + MediaRecorder
 * + HTMLAudio) with mocked ASR/LLM/TTS so it runs with no API keys.
 *
 * To go live, swap the providers for real ones pointing at your token broker:
 *
 *   import { createElevenLabsASR } from '@ottervoice/provider-elevenlabs';
 *   import { createOpenRouterLLM } from '@ottervoice/provider-openrouter';
 *   import { createAzureTTS } from '@ottervoice/provider-azure-speech';
 *   asr: createElevenLabsASR({ tokenBrokerUrl: '/api/voice/token' }),
 *   llm: createOpenRouterLLM({ tokenBrokerUrl: '/api/voice/token', model: '...' }),
 *   tts: createAzureTTS({ tokenBrokerUrl: '/api/voice/token', region: '...', voice: '...' }),
 */
import {
  createMockLLM,
  createVoiceSession,
  type ASRProvider,
  type TTSProvider,
} from '@ottervoice/core';
import { createWebRuntime } from '@ottervoice/runtime-web';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stateEl = $('state');
const logEl = $('log');
const startBtn = $<HTMLButtonElement>('start');
const doneBtn = $<HTMLButtonElement>('done');
const finishBtn = $<HTMLButtonElement>('finish');

function addTurn(role: 'user' | 'assistant', text: string) {
  const div = document.createElement('div');
  div.className = `turn ${role}`;
  div.textContent = `${role === 'user' ? '🗣' : '🤖'} ${text}`;
  logEl.appendChild(div);
}

/** Demo ASR: ignores audio bytes, emits a scripted final when the turn ends. */
function createDemoASR(lines: string[]): ASRProvider {
  let index = 0;
  return {
    name: 'demo_asr',
    capabilities: { streaming: true, batch: false, partialResults: false, languages: ['en'] },
    async createSession() {
      let finalCb: ((r: { text: string; confidence?: number }) => void) | undefined;
      return {
        sendAudio() {
          /* real PCM arrives here; the demo just acknowledges it */
        },
        async stop() {
          finalCb?.({ text: lines[index++] ?? 'Thanks, that was helpful!', confidence: 1 });
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
}

/** Demo TTS: returns a short valid silent WAV so real playback can run. */
function silentWav(durationMs: number, sampleRate = 8000): ArrayBuffer {
  const samples = Math.floor((sampleRate * durationMs) / 1000);
  const dataSize = samples * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i += 1) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, 'WAVE');
  writeStr(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, 'data');
  view.setUint32(40, dataSize, true);
  return buffer;
}

const demoTts: TTSProvider = {
  name: 'demo_tts',
  capabilities: { streaming: false, voices: [], formats: ['wav'], languages: ['en'] },
  async synthesize() {
    return { audioBuffer: silentWav(300), mimeType: 'audio/wav' };
  },
};

const runtime = createWebRuntime();

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createDemoASR([
      'I want to practice ordering coffee.',
      'A large oat milk latte, please.',
    ]),
    llm: createMockLLM({ reply: (i) => `Got it — you said: "${i.messages.at(-1)?.content ?? ''}"` }),
    tts: demoTts,
  },
});

session.on('statechange', (e) => {
  stateEl.textContent = e.to;
  const listening = e.to === 'listening';
  doneBtn.disabled = !listening;
});
session.on('asr_final', (e) => addTurn('user', e.text));
session.on('assistant_text', (e) => addTurn('assistant', e.text));
session.on('error', (e) => addTurn('assistant', `⚠️ ${e.code}: ${e.message}`));
session.on('finished', () => {
  stateEl.textContent = 'finished';
  startBtn.disabled = false;
  doneBtn.disabled = true;
  finishBtn.disabled = true;
});

startBtn.addEventListener('click', async () => {
  startBtn.disabled = true;
  finishBtn.disabled = false;
  await session.start('Hi! I can help you practice English. What would you like to work on?');
});
doneBtn.addEventListener('click', () => void session.endUserTurn());
finishBtn.addEventListener('click', () => void session.finish());
