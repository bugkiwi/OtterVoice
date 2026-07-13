/**
 * Full-duplex OpenRouter web example.
 *
 * The browser only calls the same-origin `/api/openrouter` proxy. `serve.ts`
 * reads OPENROUTER_API_KEY from `.env`; the credential is never bundled or
 * returned to the browser.
 */
import {
  createVoiceSession,
  type LLMGenerateInput,
  type LLMProvider,
  type TTSProvider,
} from '@ottervoice/core';
import {
  createOpenRouterASR,
  createOpenRouterAudioLLM,
  createOpenRouterLLM,
  createOpenRouterTTS,
} from '@ottervoice/provider-openrouter';
import { createWebRuntime, prepareBrowserAudio } from '@ottervoice/runtime-web';

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const stateEl = $('state');
const stateCopyEl = $('state-copy');
const partialEl = $('partial');
const logEl = $('log');
const meterEl = $('meter');
const startBtn = $<HTMLButtonElement>('start');
const finishBtn = $<HTMLButtonElement>('finish');
const cascadeBtn = $<HTMLButtonElement>('mode-cascade');
const audioBtn = $<HTMLButtonElement>('mode-audio');
const pipelineEl = $('pipeline-copy');
const latencyEl = $('latency');

const OPENROUTER_PROXY = '/api/openrouter';
// This is a non-secret placeholder. The Bun proxy replaces it server-side.
const PROXY_CREDENTIAL = 'ottervoice-local-proxy';
const MODELS = {
  llm: 'deepseek/deepseek-v4-flash:nitro',
  asr: 'qwen/qwen3-asr-flash-2026-02-10',
  tts: 'hexgrad/kokoro-82m',
  audioLlm: 'openai/gpt-audio-mini',
} as const;
const OPENING_MESSAGE = '你好，我是 Otter。现在可以直接跟我说话，想打断时开口就行。';

function addTurn(role: 'user' | 'assistant', text: string) {
  const div = document.createElement('div');
  div.className = `turn ${role}`;
  const label = document.createElement('span');
  label.className = 'speaker';
  label.textContent = role === 'user' ? 'You' : 'Otter';
  const message = document.createElement('span');
  message.textContent = text;
  div.append(label, message);
  logEl.appendChild(div);
  logEl.scrollTop = logEl.scrollHeight;
}

const stateCopy: Record<string, string> = {
  idle: 'Ready when you are',
  starting: 'Opening the microphone…',
  assistant_speaking: 'Otter is replying · speak to interrupt',
  listening: 'Listening continuously',
  user_speaking: 'I hear you',
  processing: 'Transcribing and thinking…',
  finished: 'Conversation ended',
  error: 'Something went wrong',
};

function renderState(state: string) {
  stateEl.textContent = state.replaceAll('_', ' ');
  stateEl.dataset.state = state;
  stateCopyEl.textContent = stateCopy[state] ?? state;
}

const proxyOptions = {
  apiKey: PROXY_CREDENTIAL,
  baseUrl: OPENROUTER_PROXY,
  referer: location.origin,
  title: 'OtterVoice Web Example',
};

const rawLlm = createOpenRouterLLM({
  ...proxyOptions,
  model: MODELS.llm,
  defaultTemperature: 0.45,
  reasoningEnabled: false,
});

const conversationLlm: LLMProvider = {
  ...rawLlm,
  generate(input: LLMGenerateInput) {
    return rawLlm.generate({
      ...input,
      system:
        '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
        '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。',
      maxTokens: 80,
      temperature: 0.45,
    });
  },
};

const rawTts = createOpenRouterTTS({
  ...proxyOptions,
  model: MODELS.tts,
  voice: 'zf_xiaoxiao',
  speed: 1.05,
});
const fastOpeningTts: TTSProvider = {
  ...rawTts,
  async synthesize(input) {
    if (input.text === OPENING_MESSAGE) {
      try {
        const response = await fetch('/opening.mp3');
        if (response.ok) {
          return {
            audioBuffer: await response.arrayBuffer(),
            mimeType: response.headers.get('content-type') ?? 'audio/mpeg',
            cached: true,
          };
        }
      } catch {
        // Local development and incomplete builds fall through to live TTS.
      }
    }
    return rawTts.synthesize(input);
  },
};

const audioLlm = createOpenRouterAudioLLM({
  ...proxyOptions,
  model: MODELS.audioLlm,
  voice: 'alloy',
  defaultTemperature: 0.45,
  prepareAudio: prepareBrowserAudio,
});

const runtime = createWebRuntime({
  volumePollMs: 50,
  mimeType: 'audio/webm;codecs=opus',
});
runtime.audioInput.onVolume((level) => {
  const normalized = Math.min(1, level / 0.08);
  meterEl.style.setProperty('--level', normalized.toFixed(3));
});

type Pipeline = 'asr_llm_tts' | 'audio_llm';
let selectedPipeline: Pipeline = 'audio_llm';
const latencySamples: Record<Pipeline, number[]> = {
  asr_llm_tts: [],
  audio_llm: [],
};

function renderPipeline() {
  const isAudio = selectedPipeline === 'audio_llm';
  cascadeBtn.classList.toggle('selected', !isAudio);
  audioBtn.classList.toggle('selected', isAudio);
  cascadeBtn.setAttribute('aria-pressed', String(!isAudio));
  audioBtn.setAttribute('aria-pressed', String(isAudio));
  pipelineEl.innerHTML = isAudio
    ? '<code>GPT Audio Mini</code> 语音直进直出 · <code>Qwen3 ASR</code> 仅并行生成字幕'
    : '<code>Qwen3 ASR</code> → <code>DeepSeek V4 Flash</code> → <code>Kokoro 82M</code>';
}

function renderLatency(currentPipeline: Pipeline, latest: number) {
  const samples = latencySamples[currentPipeline];
  const average = Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  const oldAverage = latencySamples.asr_llm_tts.length
    ? `${Math.round(latencySamples.asr_llm_tts.reduce((a, b) => a + b, 0) / latencySamples.asr_llm_tts.length)} ms`
    : '待测';
  const audioAverage = latencySamples.audio_llm.length
    ? `${Math.round(latencySamples.audio_llm.reduce((a, b) => a + b, 0) / latencySamples.audio_llm.length)} ms`
    : '待测';
  latencyEl.textContent = `本轮 ${Math.round(latest)} ms · 当前模式均值 ${average} ms · 旧 ${oldAverage} / 新 ${audioAverage}`;
}

function buildSession(pipeline: Pipeline) {
  const session = createVoiceSession({
    mode: 'full_duplex',
    pipeline,
    audioLlmSystemPrompt:
      '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
      '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。',
    runtime,
    providers: {
      asr: createOpenRouterASR({
        ...proxyOptions,
        model: MODELS.asr,
        format: 'webm',
      }),
      llm: conversationLlm,
      tts: fastOpeningTts,
      audioLlm,
    },
    turnDetection: {
      strategy: 'volume',
      minSpeechMs: 300,
      silenceTimeoutMs: 600,
      volumeThreshold: 0.025,
    },
    interruptionDetection: {
      // Core subtracts the synchronized playback envelope first; this lower
      // residual threshold makes real speech responsive without hearing itself.
      minSpeechMs: 350,
      silenceTimeoutMs: 450,
      volumeThreshold: 0.018,
    },
    policy: {
      autoStartListening: true,
      allowInterruption: true,
    },
  });

  let userAudioEndedAt: number | undefined;

  session.on('statechange', (event) => {
    renderState(event.to);
    if (event.to === 'listening' || event.to === 'user_speaking') {
      partialEl.textContent = '';
    }
  });
  session.on('asr_partial', (event) => {
    partialEl.textContent = event.text;
  });
  session.on('asr_final', (event) => {
    partialEl.textContent = '';
    if (event.text.trim().length > 0) addTurn('user', event.text);
  });
  session.on('user_audio_end', (event) => {
    userAudioEndedAt = event.at;
  });
  session.on('assistant_text', (event) => addTurn('assistant', event.text));
  session.on('assistant_audio_start', () => {
    if (userAudioEndedAt === undefined) return;
    const latency = Date.now() - userAudioEndedAt;
    latencySamples[pipeline].push(latency);
    renderLatency(pipeline, latency);
    userAudioEndedAt = undefined;
  });
  session.on('error', (event) => {
    renderState('error');
    addTurn('assistant', `${event.code}: ${event.message}`);
    startBtn.disabled = false;
    finishBtn.disabled = true;
    cascadeBtn.disabled = false;
    audioBtn.disabled = false;
  });
  session.on('finished', () => {
    renderState('finished');
    startBtn.disabled = false;
    finishBtn.disabled = true;
    cascadeBtn.disabled = false;
    audioBtn.disabled = false;
    partialEl.textContent = '';
    meterEl.style.setProperty('--level', '0');
  });
  return session;
}

let session: ReturnType<typeof buildSession> | undefined;

startBtn.addEventListener('click', async () => {
  // Must happen before any other await so delayed assistant playback retains
  // the browser's click-derived autoplay permission.
  await runtime.audioOutput.unlock?.();
  startBtn.disabled = true;
  finishBtn.disabled = false;
  logEl.innerHTML = '';
  await session?.dispose();
  cascadeBtn.disabled = true;
  audioBtn.disabled = true;
  const pipeline = selectedPipeline;
  session = buildSession(pipeline);
  await session.start(OPENING_MESSAGE);
});

finishBtn.addEventListener('click', () => void session?.finish());

for (const [button, pipeline] of [
  [cascadeBtn, 'asr_llm_tts'],
  [audioBtn, 'audio_llm'],
] as const) {
  button.addEventListener('click', () => {
    selectedPipeline = pipeline;
    renderPipeline();
  });
}

renderPipeline();
