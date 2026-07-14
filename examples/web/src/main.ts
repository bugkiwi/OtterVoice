/**
 * Full-duplex OpenRouter web example.
 *
 * The browser only calls the same-origin `/api/voice` gateway. `serve.ts`
 * reads OPENROUTER_API_KEY from `.env`; the credential is never bundled or
 * returned to the browser.
 */
import {
  createVoiceSession,
  type LLMGenerateInput,
  type LLMProvider,
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
const langZhBtn = $<HTMLButtonElement>('lang-zh');
const langEnBtn = $<HTMLButtonElement>('lang-en');

type AppLanguage = 'zh' | 'en';

const translations = {
  zh: {
    metaDescription: 'OtterVoice — 面向 Web 与 React Native 的全双工实时语音对话 SDK。',
    navDemo: '在线体验', navNative: 'React Native', navDocs: '技术文档',
    heroEyebrow: 'Open voice infrastructure · TypeScript first',
    heroLine1: '让语音对话，', heroLine2: '像呼吸一样自然。',
    heroCopy: 'OtterVoice 把持续收音、停顿提交、语音直进直出和自然打断收敛为一套跨 Web 与 React Native 的全双工会话内核。',
    heroPrimary: '直接体验', heroSecondary: '运行移动端 Demo',
    signal1Title: 'Full duplex', signal1Copy: '边播边听，开口即可打断',
    signal2Copy: '同一状态机与会话策略', signal3Copy: '音频分片返回即排队播放',
    demoEyebrow: 'Example 01 · Web full duplex', demoTitle: '现在，直接开口。',
    demoCopy: '麦克风会持续监听。停顿即提交，AI 说话时也可直接插话打断；屏幕同步保留完整文字记录。',
    pipelineFootnote: '低延迟语音网关 · Provider 可替换 · 密钥仅保留在服务端',
    controlsAria: '对话控制', modeAria: '语音处理模式', transcriptAria: '对话记录',
    modeAudio: '新 · Audio LLM', modeCascade: '旧 · ASR→LLM→TTS', liveChannel: '实时通路',
    start: '开始语音对话', finish: '结束会话',
    phoneTitle: '现在，直接开口。', phoneCopy: '持续监听；停顿提交；说话即可打断。', phoneState: '正在持续收听',
    nativeEyebrow: 'Example 02 · React Native / Expo', nativeTitle: '同一条 Audio LLM 通路，装进手机。',
    nativeCopy: 'Expo SDK 57 示例接入原生 PCM 麦克风流和无缝播放队列。它复用 Web 示例的模型、VAD、短语打断与误打断恢复策略，客户端只访问线上代理。',
    nativeFeature1Title: '持续原生收音', nativeFeature1Copy: '实时 RMS 驱动 VAD，在 AI 理解和播报期间都不会停止监听。',
    nativeFeature2Title: '分片即到即播', nativeFeature2Copy: '每个 PCM 分片落入 AudioPlaylist，首片到达即可开始播放。',
    nativeFeature3Title: '短语也能打断', nativeFeature3Copy: '200 ms 强语音快速通路兼顾中英文短指令和回声过滤。',
    nativeFeature4Title: '可扫码、可出包', nativeFeature4Copy: 'Expo Go 本地扫码预览，EAS profiles 提供模拟器与真机 Demo 包。',
    quickstartTitle: '扫码体验 · 本地开发',
    docsEyebrow: 'Project guide · Architecture', docsTitle: '基础能力负责实时，业务只需要定义对话。',
    flow1Title: 'Runtime', flow1Copy: 'Web Audio 或 Expo PCM 负责采集、音量和播放。',
    flow2Title: 'Core', flow2Copy: '状态机组织 turn、并发、打断、取消和错误恢复。',
    flow3Title: 'Providers', flow3Copy: 'Audio LLM，或可替换的 ASR → LLM → TTS 级联通路。',
    flow4Title: 'Experience', flow4Copy: '字幕、首音频延迟、连续播放与自然插话。',
    packageCore: '跨平台 VoiceSession、事件和全双工策略。',
    packageWeb: 'MediaRecorder、Web Audio VAD 与流式 PCM 播放。',
    packageNative: 'Expo 原生 PCM 输入、AudioPlaylist 输出与文件清理。',
    packageProvider: 'Audio LLM、ASR、LLM 和 TTS 的统一 OpenRouter 接入。',
    packageUtils: 'SSE、HTTP 错误和 provider 公共能力。',
    packageExamples: '可直接运行的 Web、Expo 和 Node 集成样板。',
    securityTitle: '密钥不进入浏览器或 App。',
    securityCopy: '示例统一请求 ottervoice.vercel.app 的同源语音网关，由服务端选择 Provider；生产项目可以替换为自己的网关或 token broker。',
    readDocs: '阅读技术文档 →', footerStack: 'TypeScript / Web Audio / Expo / Replaceable providers',
  },
  en: {
    metaDescription: 'OtterVoice — a full-duplex real-time voice SDK for Web and React Native.',
    navDemo: 'Live demo', navNative: 'React Native', navDocs: 'Docs',
    heroEyebrow: 'Open voice infrastructure · TypeScript first',
    heroLine1: 'Voice that feels', heroLine2: 'as natural as breathing.',
    heroCopy: 'OtterVoice brings continuous listening, pause-to-submit, speech-to-speech models and natural barge-in into one full-duplex session core for Web and React Native.',
    heroPrimary: 'Try it live', heroSecondary: 'Run the mobile demo',
    signal1Title: 'Full duplex', signal1Copy: 'Listen while playing; interrupt by speaking',
    signal2Copy: 'One state machine and session policy', signal3Copy: 'Queue audio chunks as soon as they arrive',
    demoEyebrow: 'Example 01 · Web full duplex', demoTitle: 'Now, just speak.',
    demoCopy: 'The microphone keeps listening. A pause submits your turn; speak over the assistant to interrupt while the full transcript stays on screen.',
    pipelineFootnote: 'Low-latency voice gateway · replaceable provider · secrets stay server-side',
    controlsAria: 'Conversation controls', modeAria: 'Voice processing mode', transcriptAria: 'Transcript',
    modeAudio: 'New · Audio LLM', modeCascade: 'Classic · ASR→LLM→TTS', liveChannel: 'Live channel',
    start: 'Start voice session', finish: 'End session',
    phoneTitle: 'Now, just speak.', phoneCopy: 'Always listening. Pause to submit. Speak to interrupt.', phoneState: 'Listening continuously',
    nativeEyebrow: 'Example 02 · React Native / Expo', nativeTitle: 'The same Audio LLM path, now in your pocket.',
    nativeCopy: 'The Expo SDK 57 example connects a native PCM microphone stream to a gapless playback queue. It shares the Web demo’s models, VAD, short-phrase interruption and false-barge-in recovery policy, and only calls the hosted proxy.',
    nativeFeature1Title: 'Continuous native input', nativeFeature1Copy: 'Real-time RMS drives VAD without stopping while the model thinks or speaks.',
    nativeFeature2Title: 'Play chunks on arrival', nativeFeature2Copy: 'Each PCM chunk enters AudioPlaylist, so playback begins with the first chunk.',
    nativeFeature3Title: 'Short phrases interrupt', nativeFeature3Copy: 'A 200 ms strong-speech fast path covers brief Chinese and English commands with echo filtering.',
    nativeFeature4Title: 'Scan or build', nativeFeature4Copy: 'Preview locally with Expo Go QR codes, or use EAS profiles for simulator and device packages.',
    quickstartTitle: 'Scan to try · local development',
    docsEyebrow: 'Project guide · Architecture', docsTitle: 'The infrastructure owns real time. Your product defines the conversation.',
    flow1Title: 'Runtime', flow1Copy: 'Web Audio or Expo PCM handles capture, levels and playback.',
    flow2Title: 'Core', flow2Copy: 'The state machine coordinates turns, concurrency, interruption, cancellation and recovery.',
    flow3Title: 'Providers', flow3Copy: 'Use an Audio LLM, or swap in a classic ASR → LLM → TTS cascade.',
    flow4Title: 'Experience', flow4Copy: 'Captions, first-audio latency, continuous playback and natural barge-in.',
    packageCore: 'Cross-platform VoiceSession, events and full-duplex policy.',
    packageWeb: 'MediaRecorder, Web Audio VAD and streaming PCM playback.',
    packageNative: 'Expo native PCM input, AudioPlaylist output and file cleanup.',
    packageProvider: 'Unified OpenRouter access for Audio LLM, ASR, LLM and TTS.',
    packageUtils: 'Shared SSE parsing, HTTP errors and provider primitives.',
    packageExamples: 'Runnable Web, Expo and Node integration templates.',
    securityTitle: 'Secrets never enter the browser or app.',
    securityCopy: 'The examples call the same-origin voice gateway at ottervoice.vercel.app, where the provider is selected server-side. Production apps can replace it with their own gateway or token broker.',
    readDocs: 'Read the docs →', footerStack: 'TypeScript / Web Audio / Expo / Replaceable providers',
  },
} as const;

let language: AppLanguage = (() => {
  const saved = localStorage.getItem('ottervoice-language');
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
})();

const VOICE_GATEWAY = '/api/voice';
// This is a non-secret placeholder. The Bun proxy replaces it server-side.
const PROXY_CREDENTIAL = 'ottervoice-local-proxy';
const MODELS = {
  llm: 'deepseek/deepseek-v4-flash:nitro',
  asr: 'qwen/qwen3-asr-flash-2026-02-10',
  tts: 'hexgrad/kokoro-82m',
  audioLlm: 'openai/gpt-audio-mini',
} as const;
type SseAudioCapture = {
  audioBuffer: ArrayBuffer;
  mimeType: string;
  chunkCount: number;
  byteLength: number;
};

let lastSseAudio: SseAudioCapture | undefined;
let debugAudioPlayer: HTMLAudioElement | undefined;

const runtimeText = {
  zh: {
    you: '你', otter: 'Otter', playing: '播放中…', playFailed: '播放失败', playSse: '▶ SSE 音频',
    playTitle: '播放 OpenRouter SSE 组装后的原始音频（独立于会话播放）', chunks: '片', pending: '待测',
    latencyEmpty: '完成一轮对话后显示“停顿 → 开始播放”的实测延迟',
    pipelineAudio: '<code>GPT Audio Mini</code> 语音直进直出 · <code>Qwen3 ASR</code> 仅并行生成字幕',
    pipelineCascade: '<code>Qwen3 ASR</code> → <code>DeepSeek V4 Flash</code> → <code>Kokoro 82M</code>',
  },
  en: {
    you: 'You', otter: 'Otter', playing: 'Playing…', playFailed: 'Playback failed', playSse: '▶ SSE audio',
    playTitle: 'Play the original audio assembled from OpenRouter SSE chunks', chunks: 'chunks', pending: 'pending',
    latencyEmpty: 'Measured pause → first audio playback latency appears after one turn',
    pipelineAudio: '<code>GPT Audio Mini</code> speech-to-speech · <code>Qwen3 ASR</code> captions in parallel',
    pipelineCascade: '<code>Qwen3 ASR</code> → <code>DeepSeek V4 Flash</code> → <code>Kokoro 82M</code>',
  },
} as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function playSseAudio(capture: SseAudioCapture, button: HTMLButtonElement) {
  debugAudioPlayer?.pause();
  if (debugAudioPlayer) {
    const previousUrl = debugAudioPlayer.dataset.objectUrl;
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }
  const url = URL.createObjectURL(new Blob([capture.audioBuffer], { type: capture.mimeType }));
  const audio = new Audio(url);
  audio.dataset.objectUrl = url;
  debugAudioPlayer = audio;
  button.disabled = true;
  button.textContent = runtimeText[language].playing;
  void audio.play().catch(() => {
    button.textContent = runtimeText[language].playFailed;
    button.disabled = false;
  });
  audio.onended = () => {
    button.textContent = runtimeText[language].playSse;
    button.disabled = false;
  };
}

const turnElements = new Map<string, HTMLDivElement>();

function addTurn(
  role: 'user' | 'assistant',
  text: string,
  options?: { turnId?: string; live?: boolean; sseAudio?: SseAudioCapture },
) {
  let div = options?.turnId ? turnElements.get(options.turnId) : undefined;
  let body: HTMLDivElement;
  let message: HTMLSpanElement;
  if (div) {
    body = div.querySelector<HTMLDivElement>('.turn-body')!;
    message = body.querySelector<HTMLSpanElement>('.turn-message')!;
  } else {
    div = document.createElement('div');
    div.className = `turn ${role}`;
    const label = document.createElement('span');
    label.className = 'speaker';
    label.textContent = role === 'user' ? runtimeText[language].you : runtimeText[language].otter;
    body = document.createElement('div');
    body.className = 'turn-body';
    message = document.createElement('span');
    message.className = 'turn-message';
    body.append(message);
    div.append(label, body);
    logEl.appendChild(div);
    if (options?.turnId) turnElements.set(options.turnId, div);
  }
  message.textContent = `${text}${options?.live ? ' ▍' : ''}`;

  if (role === 'assistant' && options?.sseAudio && !body.querySelector('.sse-audio-play')) {
    const capture = options.sseAudio;
    const playBtn = document.createElement('button');
    playBtn.type = 'button';
    playBtn.className = 'sse-audio-play';
    playBtn.textContent = runtimeText[language].playSse;
    playBtn.title = runtimeText[language].playTitle;
    playBtn.addEventListener('click', () => playSseAudio(capture, playBtn));
    const meta = document.createElement('span');
    meta.className = 'sse-audio-meta';
    meta.textContent = `${capture.chunkCount} ${runtimeText[language].chunks} · ${formatBytes(capture.byteLength)}`;
    body.append(playBtn, meta);
  }

  logEl.scrollTop = logEl.scrollHeight;
}

const stateCopy: Record<AppLanguage, Record<string, string>> = {
  zh: {
    idle: '准备好就可以开始', starting: '正在打开麦克风…',
    assistant_speaking: 'Otter 正在回复 · 开口即可打断', listening: '正在持续收听',
    user_speaking: '听到你了', processing: '正在转写和理解…', finished: '本次对话已结束', error: '通路出现问题',
  },
  en: {
    idle: 'Ready when you are', starting: 'Opening the microphone…',
    assistant_speaking: 'Otter is replying · speak to interrupt', listening: 'Listening continuously',
    user_speaking: 'I hear you', processing: 'Transcribing and thinking…', finished: 'Conversation ended', error: 'Something went wrong',
  },
};

function renderState(state: string) {
  stateEl.textContent = state.replaceAll('_', ' ');
  stateEl.dataset.state = state;
  stateCopyEl.textContent = stateCopy[language][state] ?? state;
}

const proxyOptions = {
  apiKey: PROXY_CREDENTIAL,
  baseUrl: VOICE_GATEWAY,
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
  stream(input: LLMGenerateInput) {
    return rawLlm.stream!({
      ...input,
      system:
        '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
        '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。',
      maxTokens: 80,
      temperature: 0.45,
    });
  },
};

const tts = createOpenRouterTTS({
  ...proxyOptions,
  model: MODELS.tts,
  voice: 'zf_xiaoxiao',
  speed: 1.05,
});

const audioLlmBase = createOpenRouterAudioLLM({
  ...proxyOptions,
  model: MODELS.audioLlm,
  voice: 'alloy',
  defaultTemperature: 0.45,
  // Base64 expands PCM by one third. A 16 kHz / 90 s mono WAV remains below
  // Vercel's 4.5 MB function payload limit with room for the JSON envelope.
  prepareAudio: (audio, format) => prepareBrowserAudio(audio, format, {
    sampleRate: 16_000,
    maxDurationMs: 90_000,
  }),
});
const audioLlm = {
  ...audioLlmBase,
  async generate(
    ...args: Parameters<typeof audioLlmBase.generate>
  ): ReturnType<typeof audioLlmBase.generate> {
    const output = await audioLlmBase.generate(...args);
    const raw = output.raw as
      | { audioChunkCount?: number; audioByteLength?: number }
      | undefined;
    lastSseAudio = {
      audioBuffer: output.audioBuffer.slice(0),
      mimeType: output.mimeType,
      chunkCount: raw?.audioChunkCount ?? 0,
      byteLength: raw?.audioByteLength ?? output.audioBuffer.byteLength,
    };
    return output;
  },
};

const runtime = createWebRuntime({
  // Feed WebM timeslices to ASR while the user is still speaking.
  timesliceMs: 100,
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
    ? runtimeText[language].pipelineAudio
    : runtimeText[language].pipelineCascade;
}

let lastLatency: { pipeline: Pipeline; value: number } | undefined;

function renderLatency(currentPipeline: Pipeline, latest: number) {
  lastLatency = { pipeline: currentPipeline, value: latest };
  const samples = latencySamples[currentPipeline];
  const average = Math.round(samples.reduce((sum, value) => sum + value, 0) / samples.length);
  const oldAverage = latencySamples.asr_llm_tts.length
    ? `${Math.round(latencySamples.asr_llm_tts.reduce((a, b) => a + b, 0) / latencySamples.asr_llm_tts.length)} ms`
    : runtimeText[language].pending;
  const audioAverage = latencySamples.audio_llm.length
    ? `${Math.round(latencySamples.audio_llm.reduce((a, b) => a + b, 0) / latencySamples.audio_llm.length)} ms`
    : runtimeText[language].pending;
  latencyEl.textContent = language === 'zh'
    ? `本轮 ${Math.round(latest)} ms · 当前模式均值 ${average} ms · 旧 ${oldAverage} / 新 ${audioAverage}`
    : `Latest ${Math.round(latest)} ms · current average ${average} ms · classic ${oldAverage} / Audio LLM ${audioAverage}`;
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
        partialIntervalMs: 500,
      }),
      llm: conversationLlm,
      tts,
      audioLlm,
    },
    turnDetection: {
      strategy: 'volume',
      minSpeechMs: 180,
      silenceTimeoutMs: 450,
      maxTurnMs: 80_000,
      volumeThreshold: 0.025,
    },
    interruptionDetection: {
      // Core subtracts the synchronized playback envelope first; this lower
      // residual threshold makes real speech responsive without hearing itself.
      // Four 50 ms foreground frames make short commands such as “停” eligible
      // for the strong-speech fast path; weaker candidates still use the
      // echo-tail and ASR confirmation path.
      minSpeechMs: 160,
      silenceTimeoutMs: 350,
      volumeThreshold: 0.018,
    },
    policy: {
      autoStartListening: true,
      allowInterruption: true,
      interruptionTailIgnoreMs: 200,
      falseInterruptionSilenceMs: 400,
      falseInterruptionTimeoutMs: 1_200,
      interruptionCooldownMs: 500,
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
    if (event.text.trim().length > 0) {
      addTurn('user', event.text, { turnId: event.turnId, live: true });
    }
  });
  session.on('asr_final', (event) => {
    partialEl.textContent = '';
    if (event.text.trim().length > 0) {
      addTurn('user', event.text, { turnId: event.turnId });
    }
  });
  session.on('user_audio_end', (event) => {
    userAudioEndedAt = event.at;
  });
  session.on('assistant_text_delta', (event) => {
    addTurn('assistant', event.text, { turnId: event.turnId, live: true });
  });
  session.on('assistant_text', (event) => {
    const sseAudio = pipeline === 'audio_llm' ? lastSseAudio : undefined;
    addTurn('assistant', event.text, {
      turnId: event.turnId,
      ...(sseAudio ? { sseAudio } : {}),
    });
    lastSseAudio = undefined;
  });
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
  try {
    await runtime.audioOutput.unlock?.();
  } catch (error) {
    // Some embedded browsers reject the silent autoplay probe even after a
    // click. Input/ASR must still start; real playback keeps its own error path.
    console.warn('Playback unlock was rejected; continuing with microphone input.', error);
  }
  startBtn.disabled = true;
  finishBtn.disabled = false;
  logEl.innerHTML = '';
  turnElements.clear();
  lastSseAudio = undefined;
  debugAudioPlayer?.pause();
  await session?.dispose();
  cascadeBtn.disabled = true;
  audioBtn.disabled = true;
  const pipeline = selectedPipeline;
  session = buildSession(pipeline);
  await session.start();
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

function applyLanguage(next: AppLanguage) {
  language = next;
  localStorage.setItem('ottervoice-language', next);
  document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
  const dictionary: Record<string, string> = translations[next];
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    if (key && dictionary[key]) element.textContent = dictionary[key];
  });
  document.querySelectorAll<HTMLElement>('[data-i18n-aria]').forEach((element) => {
    const key = element.dataset.i18nAria;
    if (key && dictionary[key]) element.setAttribute('aria-label', dictionary[key]);
  });
  document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
    'content',
    dictionary.metaDescription ?? '',
  );
  langZhBtn.classList.toggle('selected', next === 'zh');
  langEnBtn.classList.toggle('selected', next === 'en');
  langZhBtn.setAttribute('aria-pressed', String(next === 'zh'));
  langEnBtn.setAttribute('aria-pressed', String(next === 'en'));

  logEl.querySelectorAll<HTMLElement>('.turn').forEach((turn) => {
    const speaker = turn.querySelector<HTMLElement>('.speaker');
    if (!speaker) return;
    speaker.textContent = turn.classList.contains('user')
      ? runtimeText[next].you
      : runtimeText[next].otter;
  });
  logEl.querySelectorAll<HTMLButtonElement>('.sse-audio-play:not(:disabled)').forEach((button) => {
    button.textContent = runtimeText[next].playSse;
    button.title = runtimeText[next].playTitle;
  });

  renderPipeline();
  renderState(stateEl.dataset.state ?? 'idle');
  if (lastLatency) renderLatency(lastLatency.pipeline, lastLatency.value);
  else latencyEl.textContent = runtimeText[next].latencyEmpty;
}

langZhBtn.addEventListener('click', () => applyLanguage('zh'));
langEnBtn.addEventListener('click', () => applyLanguage('en'));

applyLanguage(language);
