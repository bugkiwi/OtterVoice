# Universal Voice AI SDK 技术设计文档

> 版本：v0.1  
> 技术栈：TypeScript + Bun  
> 目标平台：Web / React Native / Node.js / 未来 Swift / Android Native  
> 适用项目：IELTS Speaking、Barki.app，以及其他需要 ASR + LLM + TTS 的实时/准实时语音交互项目

---

## 1. 背景与目标

你现在有多个项目都需要类似能力：

- IELTS Speaking：AI 雅思口语考官，支持准实时对话、评分、复练。
- Barki.app：可能需要语音对话、语音助手、语音输入/输出。
- 未来其他 App/Web 项目：可能需要统一的语音 AI 能力。

因此不建议在每个业务项目里重复接入 ASR、LLM、TTS。更好的方式是抽出一个通用 SDK：

```txt
Universal Voice AI SDK
  = Audio Capture
  + ASR Adapter
  + LLM Adapter
  + TTS Adapter
  + Voice Session State Machine
  + Provider Router
  + Platform Runtime Adapter
```

这个 SDK 不追求一开始做成 OpenAI Realtime / LiveKit 那种全双工 voice agent，而是优先支持：

```txt
半双工准实时语音交互：
AI 说话 → 用户说话 → ASR 识别 → LLM 生成 → TTS 播放 → 下一轮
```

这条路线更适合当前约束：

- 不依赖 WebRTC。
- 不依赖 LiveKit。
- 可以服务全球用户。
- 中国区可以做 fallback。
- 可以在 Web 和 React Native 复用。
- 成本可控。
- 未来可以扩展到 Swift / Android Native。

---

## 2. 非目标

第一版 SDK 不做这些事情：

1. 不做全双工实时通话。
2. 不做 WebRTC media server。
3. 不做 LiveKit/Agora 强绑定。
4. 不做自研 ASR/TTS 模型。
5. 不做完整教育业务逻辑，例如 IELTS 题库、评分报告 UI。
6. 不直接内置支付、订阅、用户系统。
7. 不把 OpenAI、豆包、讯飞等任意一个 provider 写死为核心依赖。

SDK 只提供通用语音 AI 基础设施，业务项目自己决定产品逻辑。

---

## 3. 设计原则

### 3.1 Provider 可替换

SDK 内部不应出现这种业务层强耦合代码：

```ts
await callDoubao(prompt)
await callElevenLabs(text)
await callAzureTTS(text)
```

而应该是：

```ts
await llm.generate(input)
await tts.synthesize(input)
await asrSession.sendAudio(chunk)
```

每个 provider 只是接口实现。

---

### 3.2 Runtime 可替换

不同平台的音频能力完全不同：

| 平台 | 音频采集 | 音频播放 | WebSocket | 文件系统 |
|---|---|---|---|---|
| Web | getUserMedia / AudioWorklet | HTMLAudioElement / Web Audio API | 原生支持 | Blob / IndexedDB |
| React Native | expo-audio / native module | expo-audio / native player | 支持 | FileSystem |
| Node.js | 文件/流 | 无 UI 播放 | ws / undici | fs |
| Swift | AVAudioEngine | AVAudioPlayer | URLSessionWebSocketTask | FileManager |
| Android | AudioRecord | ExoPlayer / AudioTrack | OkHttp WebSocket | Files |

SDK 的 core 层不能依赖 DOM、Expo、Node fs 等特定运行时能力。

---

### 3.3 Core 纯 TypeScript

核心逻辑必须是平台无关的 TypeScript：

- 状态机
- 事件系统
- provider router
- session lifecycle
- transcript buffer
- turn detection policy
- usage metering
- error normalization

平台相关能力通过 runtime adapter 注入。

---

### 3.4 默认半双工

SDK 第一版主流程是：

```txt
assistant_speaking
  ↓
listening
  ↓
user_speaking
  ↓
processing
  ↓
assistant_speaking
```

这比全双工更适合：

- IELTS Speaking
- 语音助手
- 口语练习
- 任务型对话
- 儿童/教育类语音交互

---

### 3.5 LLM 与语音分离

不要把语音服务和 LLM 绑定到一个平台。推荐分层：

```txt
ASR：ElevenLabs / Deepgram / Azure / Xfyun / Aliyun
LLM：OpenRouter / OpenAI / Gemini / Claude / DeepSeek / Qwen
TTS：Azure / ElevenLabs / OpenAI / Google / Xfyun / Aliyun
Pronunciation：Azure / Xfyun / Approximation
```

---

## 4. 外部生态参考

### 4.1 Vercel AI SDK

Vercel AI SDK 是 TypeScript AI toolkit，适合统一 LLM generate/stream/fallback。OpenRouter 社区 provider 可以让 AI SDK 访问 OpenRouter 上的多模型网关。  
参考：

- Vercel AI SDK Provider: OpenRouter: https://ai-sdk.dev/providers/community-providers/openrouter
- OpenRouter Vercel AI SDK Guide: https://openrouter.ai/docs/guides/community/vercel-ai-sdk
- OpenRouter AI SDK Provider GitHub: https://github.com/OpenRouterTeam/ai-sdk-provider

SDK 建议：

```txt
LLM 层优先基于 Vercel AI SDK + OpenRouter Provider 封装。
```

---

### 4.2 Bun

Bun 支持 TypeScript、bundler、test runner、package manager，适合作为 SDK 的开发与构建工具。Bun bundler 支持 server/client 代码构建；Bun module resolution 支持 package.json exports conditions。  
参考：

- Bun Bundler: https://bun.com/docs/bundler
- Bun TypeScript: https://bun.com/docs/typescript
- Bun Module Resolution: https://bun.sh/docs/runtime/module-resolution

SDK 建议：

```txt
用 Bun 做 workspace、test、build；用 package exports 输出多个入口。
```

---

### 4.3 Expo / React Native Audio

React Native 端可以优先支持 Expo 生态。Expo 的 `expo-av` Audio 可用于录音与播放，但未来应关注 Expo 新音频包迁移。  
参考：

- Expo Audio / expo-av: https://docs.expo.dev/versions/latest/sdk/audio-av/

SDK 建议：

```txt
第一版提供 @voice-ai-sdk/react-native-expo runtime adapter。
后续再支持 bare React Native native module。
```

---

## 5. SDK 总体架构

```txt
┌─────────────────────────────────────────────────────────────┐
│ Business Apps                                                │
│ IELTS Speaking / Barki.app / Other Apps                      │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│ @voice-ai-sdk/core                                           │
│ VoiceSession / State Machine / Provider Router / Events      │
└─────────────────────────────────────────────────────────────┘
          ↓                     ↓                    ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Runtime Adapter │   │ Provider Adapter│   │ Domain Plugin   │
│ Web / RN / Node │   │ ASR/LLM/TTS     │   │ IELTS / Barki   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
          ↓                     ↓                    ↓
┌─────────────────┐   ┌─────────────────┐   ┌─────────────────┐
│ Microphone      │   │ Cloud APIs      │   │ Business Logic  │
│ Audio Playback  │   │ OpenRouter etc. │   │ Rubric/Prompt   │
└─────────────────┘   └─────────────────┘   └─────────────────┘
```

---

## 6. 包设计

建议 monorepo：

```txt
voice-ai-sdk/
  package.json
  bun.lock
  tsconfig.base.json
  README.md

  packages/
    core/
      src/
      package.json

    runtime-web/
      src/
      package.json

    runtime-react-native/
      src/
      package.json

    runtime-node/
      src/
      package.json

    provider-openrouter/
      src/
      package.json

    provider-elevenlabs/
      src/
      package.json

    provider-deepgram/
      src/
      package.json

    provider-azure-speech/
      src/
      package.json

    provider-xfyun/
      src/
      package.json

    plugin-ielts/
      src/
      package.json

    plugin-barki/
      src/
      package.json

  examples/
    web-nextjs/
    web-vite/
    react-native-expo/
    node-cli/
    ielts-speaking-demo/
    barki-voice-demo/
```

---

## 7. 推荐 package 命名

可以先内部使用，后续发布 npm：

```txt
@voice-ai-sdk/core
@voice-ai-sdk/runtime-web
@voice-ai-sdk/runtime-react-native
@voice-ai-sdk/runtime-node
@voice-ai-sdk/provider-openrouter
@voice-ai-sdk/provider-elevenlabs
@voice-ai-sdk/provider-azure-speech
@voice-ai-sdk/provider-deepgram
@voice-ai-sdk/provider-xfyun
@voice-ai-sdk/plugin-ielts
@voice-ai-sdk/plugin-barki
```

如果想避免通用名冲突，可以用自己的 scope：

```txt
@yabao/voice-core
@yabao/voice-runtime-web
@yabao/voice-provider-openrouter
```

更现实建议：先用内部 scope，比如：

```txt
@tingshuai/voice-core
```

后续产品化再改名。

---

## 8. 分层设计

### 8.1 Core Layer

`@voice-ai-sdk/core` 提供：

- VoiceSession
- StateMachine
- EventEmitter
- ProviderRouter
- TranscriptBuffer
- TurnDetector
- UsageMeter
- NormalizedError
- Common types

不包含：

- DOM
- React
- React Native
- Node-specific APIs
- provider secret
- business prompt

---

### 8.2 Runtime Layer

runtime 负责平台能力：

```ts
export interface RuntimeAdapter {
  audioInput: AudioInputAdapter
  audioOutput: AudioOutputAdapter
  network: NetworkAdapter
  storage?: RuntimeStorageAdapter
  logger?: LoggerAdapter
}
```

Web、React Native、Node 分别实现。

---

### 8.3 Provider Layer

provider 负责云服务：

```txt
ASR Provider：实时/文件语音识别
LLM Provider：对话、评分、改写
TTS Provider：语音合成
Pronunciation Provider：发音评测
```

---

### 8.4 Plugin Layer

plugin 是业务逻辑扩展，例如：

```txt
plugin-ielts：雅思口语流程、评分 rubric、part 1/2/3 prompt
plugin-barki：Barki 的 voice assistant persona / task prompt
```

plugin 不应影响 core 的通用性。

---

## 9. Core Type 设计

### 9.1 VoiceSession 状态

```ts
export type VoiceSessionState =
  | 'idle'
  | 'starting'
  | 'assistant_speaking'
  | 'listening'
  | 'user_speaking'
  | 'processing'
  | 'scoring'
  | 'paused'
  | 'finished'
  | 'error'
```

---

### 9.2 事件定义

```ts
export type VoiceSessionEventMap = {
  statechange: {
    from: VoiceSessionState
    to: VoiceSessionState
    reason?: string
  }

  asr_partial: {
    text: string
    turnId: string
    confidence?: number
  }

  asr_final: {
    text: string
    turnId: string
    confidence?: number
    durationMs?: number
  }

  assistant_text: {
    text: string
    turnId: string
  }

  assistant_audio_start: {
    turnId: string
  }

  assistant_audio_end: {
    turnId: string
  }

  usage: VoiceUsageSnapshot

  error: NormalizedVoiceError
}
```

---

### 9.3 Turn 数据结构

```ts
export interface VoiceTurn {
  id: string
  role: 'user' | 'assistant' | 'system'
  text: string
  audioUrl?: string
  startedAt: number
  endedAt?: number
  durationMs?: number
  metadata?: Record<string, unknown>
}
```

---

### 9.4 Session 配置

```ts
export interface VoiceSessionConfig {
  mode: 'half_duplex' | 'full_duplex' | 'push_to_talk' | 'streaming_transcript'

  runtime: RuntimeAdapter

  providers: {
    asr: ASRProvider
    llm: LLMProvider
    tts?: TTSProvider
    pronunciation?: PronunciationProvider
  }

  policy?: {
    silenceTimeoutMs?: number
    maxTurnDurationMs?: number
    maxSessionDurationMs?: number
    autoStartListening?: boolean
    allowInterruption?: boolean
  }

  metadata?: Record<string, unknown>
}
```

---

## 10. Provider Interface 设计

### 10.1 ASR Provider

```ts
export interface ASRProvider {
  name: string
  capabilities: ASRCapabilities
  createSession(options: ASRSessionOptions): Promise<ASRSession>
}

export interface ASRCapabilities {
  streaming: boolean
  batch: boolean
  partialResults: boolean
  wordTimestamps?: boolean
  confidence?: boolean
  endpointing?: boolean
  languages: string[]
}

export interface ASRSessionOptions {
  language?: string
  sampleRate?: number
  encoding?: 'pcm_s16le' | 'opus' | 'webm' | 'wav' | 'mp3'
  interimResults?: boolean
  endpointing?: boolean
  metadata?: Record<string, unknown>
}

export interface ASRSession {
  sendAudio(chunk: ArrayBuffer): void | Promise<void>
  stop(): Promise<void>
  close(): Promise<void>

  onPartial(cb: (result: ASRResult) => void): () => void
  onFinal(cb: (result: ASRResult) => void): () => void
  onError(cb: (error: NormalizedVoiceError) => void): () => void
}

export interface ASRResult {
  text: string
  confidence?: number
  startMs?: number
  endMs?: number
  words?: ASRWord[]
  raw?: unknown
}

export interface ASRWord {
  text: string
  startMs?: number
  endMs?: number
  confidence?: number
}
```

---

### 10.2 LLM Provider

LLM 可以直接基于 Vercel AI SDK 封装。

```ts
export interface LLMProvider {
  name: string
  generate(input: LLMGenerateInput): Promise<LLMGenerateOutput>
  stream?(input: LLMGenerateInput): AsyncIterable<LLMStreamChunk>
}

export interface LLMGenerateInput {
  system?: string
  messages: LLMMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: 'text' | 'json'
  metadata?: Record<string, unknown>
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface LLMGenerateOutput {
  text: string
  json?: unknown
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
  }
  raw?: unknown
}

export interface LLMStreamChunk {
  type: 'text_delta' | 'usage' | 'done' | 'error'
  text?: string
  usage?: LLMGenerateOutput['usage']
  error?: NormalizedVoiceError
}
```

---

### 10.3 TTS Provider

```ts
export interface TTSProvider {
  name: string
  capabilities: TTSCapabilities
  synthesize(input: TTSInput): Promise<TTSOutput>
}

export interface TTSCapabilities {
  streaming: boolean
  voices: TTSVoice[]
  formats: TTSFormat[]
  languages: string[]
}

export type TTSFormat = 'mp3' | 'wav' | 'ogg' | 'opus' | 'pcm'

export interface TTSVoice {
  id: string
  name: string
  language: string
  gender?: 'male' | 'female' | 'neutral'
  style?: string[]
}

export interface TTSInput {
  text: string
  voice?: string
  language?: string
  speed?: number
  pitch?: number
  format?: TTSFormat
  cacheKey?: string
  metadata?: Record<string, unknown>
}

export interface TTSOutput {
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  mimeType: string
  durationMs?: number
  cached?: boolean
  raw?: unknown
}
```

---

### 10.4 Pronunciation Provider

```ts
export interface PronunciationProvider {
  name: string
  assess(input: PronunciationInput): Promise<PronunciationResult>
}

export interface PronunciationInput {
  audio?: ArrayBuffer | string
  transcript: string
  referenceText?: string
  language?: string
  durationMs?: number
  words?: ASRWord[]
  metadata?: Record<string, unknown>
}

export interface PronunciationResult {
  overall?: number
  accuracy?: number
  fluency?: number
  completeness?: number
  prosody?: number
  words?: Array<{
    text: string
    score?: number
    errorType?: string
  }>
  raw?: unknown
}
```

---

## 11. Runtime Adapter 设计

### 11.1 Audio Input Adapter

```ts
export interface AudioInputAdapter {
  requestPermission(): Promise<boolean>
  start(options: AudioInputOptions): Promise<void>
  stop(): Promise<void>
  pause?(): Promise<void>
  resume?(): Promise<void>

  onChunk(cb: (chunk: AudioChunk) => void): () => void
  onVolume?(cb: (level: number) => void): () => void
  onError(cb: (error: NormalizedVoiceError) => void): () => void
}

export interface AudioInputOptions {
  sampleRate?: number
  channels?: number
  encoding?: 'pcm_s16le' | 'opus' | 'webm'
  chunkMs?: number
  echoCancellation?: boolean
  noiseSuppression?: boolean
  autoGainControl?: boolean
}

export interface AudioChunk {
  data: ArrayBuffer
  timestamp: number
  durationMs?: number
  sampleRate?: number
  encoding?: string
}
```

---

### 11.2 Audio Output Adapter

```ts
export interface AudioOutputAdapter {
  play(input: AudioPlaybackInput): Promise<void>
  stop(): Promise<void>
  pause?(): Promise<void>
  resume?(): Promise<void>

  onStart(cb: () => void): () => void
  onEnd(cb: () => void): () => void
  onError(cb: (error: NormalizedVoiceError) => void): () => void
}

export interface AudioPlaybackInput {
  audioUrl?: string
  audioBuffer?: ArrayBuffer
  mimeType?: string
  volume?: number
}
```

---

### 11.3 Network Adapter

```ts
export interface NetworkAdapter {
  fetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response>
  createWebSocket(url: string, protocols?: string | string[]): RuntimeWebSocket
}

export interface RuntimeWebSocket {
  send(data: string | ArrayBuffer): void
  close(code?: number, reason?: string): void
  onOpen(cb: () => void): () => void
  onMessage(cb: (data: string | ArrayBuffer) => void): () => void
  onError(cb: (error: unknown) => void): () => void
  onClose(cb: () => void): () => void
}
```

---

## 12. Provider Router 设计

### 12.1 Profile

```ts
export type ProviderProfileName =
  | 'global_budget'
  | 'global_pro'
  | 'china_fallback'
  | 'developer_test'

export interface ProviderProfile {
  name: ProviderProfileName
  asr: string
  llmConversation: string
  llmScoring?: string
  tts?: string
  pronunciation?: string
}
```

---

### 12.2 示例配置

```ts
export const providerProfiles = {
  global_budget: {
    name: 'global_budget',
    asr: 'elevenlabs_scribe_realtime',
    llmConversation: 'openrouter_gemini_flash_lite',
    llmScoring: 'openrouter_gemini_flash',
    tts: 'azure_neural_tts',
    pronunciation: 'approximation',
  },

  global_pro: {
    name: 'global_pro',
    asr: 'deepgram_nova_streaming',
    llmConversation: 'openrouter_gemini_flash',
    llmScoring: 'openai_or_claude',
    tts: 'elevenlabs_flash',
    pronunciation: 'azure_pronunciation',
  },

  china_fallback: {
    name: 'china_fallback',
    asr: 'xfyun_streaming',
    llmConversation: 'deepseek_or_qwen',
    llmScoring: 'deepseek_or_qwen',
    tts: 'xfyun_tts',
    pronunciation: 'xfyun_or_approximation',
  },

  developer_test: {
    name: 'developer_test',
    asr: 'mock_asr',
    llmConversation: 'mock_llm',
    llmScoring: 'mock_llm',
    tts: 'mock_tts',
    pronunciation: 'approximation',
  },
} satisfies Record<string, ProviderProfile>
```

---

### 12.3 路由规则

```ts
export interface ProviderRoutingContext {
  region?: 'global' | 'china' | 'unknown'
  plan?: 'free' | 'basic' | 'pro'
  feature?: 'conversation' | 'mock_test' | 'scoring' | 'pronunciation'
  latencyPreference?: 'low' | 'balanced' | 'quality'
  costPreference?: 'low' | 'balanced' | 'quality'
}
```

示例：

```ts
export function resolveProfile(ctx: ProviderRoutingContext): ProviderProfileName {
  if (ctx.region === 'china') return 'china_fallback'
  if (ctx.plan === 'pro') return 'global_pro'
  return 'global_budget'
}
```

---

## 13. VoiceSession 状态机

### 13.1 状态流转

```txt
idle
  ↓ start()
starting
  ↓
assistant_speaking
  ↓ assistant audio ended
listening
  ↓ user voice detected
user_speaking
  ↓ silence timeout / endpoint detected
processing
  ↓ LLM + TTS ready
assistant_speaking
  ↓ loop
finished
```

---

### 13.2 核心实现草图

```ts
export class VoiceSession {
  private state: VoiceSessionState = 'idle'
  private turns: VoiceTurn[] = []

  constructor(private config: VoiceSessionConfig) {}

  async start(initialPrompt?: string) {
    this.transition('starting')

    if (initialPrompt) {
      await this.speakAssistant(initialPrompt)
    }

    if (this.config.policy?.autoStartListening !== false) {
      await this.startListening()
    }
  }

  async startListening() {
    this.transition('listening')

    const asrSession = await this.config.providers.asr.createSession({
      language: 'en',
      interimResults: true,
    })

    asrSession.onPartial((result) => {
      this.emit('asr_partial', { text: result.text, turnId: this.currentTurnId() })
    })

    asrSession.onFinal(async (result) => {
      await this.handleUserFinalTranscript(result.text)
    })

    this.config.runtime.audioInput.onChunk((chunk) => {
      asrSession.sendAudio(chunk.data)
    })

    await this.config.runtime.audioInput.start({
      sampleRate: 16000,
      encoding: 'pcm_s16le',
      chunkMs: 100,
    })
  }

  private async handleUserFinalTranscript(text: string) {
    this.transition('processing')
    this.addTurn({ role: 'user', text })

    const reply = await this.config.providers.llm.generate({
      messages: this.turns.map((t) => ({ role: t.role as any, content: t.text })),
    })

    await this.speakAssistant(reply.text)
    await this.startListening()
  }

  private async speakAssistant(text: string) {
    this.transition('assistant_speaking')
    this.addTurn({ role: 'assistant', text })

    const tts = this.config.providers.tts
    if (!tts) return

    const audio = await tts.synthesize({ text, format: 'mp3' })
    await this.config.runtime.audioOutput.play(audio)
  }

  private transition(next: VoiceSessionState) {
    const prev = this.state
    this.state = next
    this.emit('statechange', { from: prev, to: next })
  }
}
```

> 上面是结构草图，不是最终代码。真实实现需要处理取消、错误、并发状态、音频播放结束事件、ASR session 关闭等。

---

## 14. Turn Detection 设计

第一版不要过度复杂。

### 14.1 规则型 VAD

```txt
音量超过阈值 → user_speaking
音量低于阈值持续 1000–1500ms → 用户说完
```

配置：

```ts
export interface TurnDetectionConfig {
  strategy: 'volume' | 'asr_endpointing' | 'manual' | 'hybrid'
  minSpeechMs?: number
  silenceTimeoutMs?: number
  maxTurnMs?: number
  volumeThreshold?: number
}
```

建议默认：

```ts
const defaultTurnDetection: TurnDetectionConfig = {
  strategy: 'hybrid',
  minSpeechMs: 500,
  silenceTimeoutMs: 1200,
  maxTurnMs: 120_000,
  volumeThreshold: 0.02,
}
```

---

## 15. Usage Metering

SDK 应该提供基础用量统计，但不负责计费。

```ts
export interface VoiceUsageSnapshot {
  sessionDurationMs: number
  userSpeechMs: number
  assistantSpeechChars: number
  asrAudioMs: number
  ttsChars: number
  llmInputTokens?: number
  llmOutputTokens?: number
  providerCosts?: Record<string, number>
}
```

业务项目可以基于 usage 做：

- 免费分钟数
- 订阅套餐
- Mock Test 次数
- Pro 高质量语音额度

---

## 16. 错误模型

```ts
export type VoiceErrorCode =
  | 'permission_denied'
  | 'microphone_unavailable'
  | 'network_error'
  | 'asr_connection_failed'
  | 'asr_timeout'
  | 'llm_failed'
  | 'tts_failed'
  | 'audio_playback_failed'
  | 'provider_rate_limited'
  | 'provider_quota_exceeded'
  | 'unsupported_runtime'
  | 'unknown'

export interface NormalizedVoiceError {
  code: VoiceErrorCode
  message: string
  provider?: string
  retryable?: boolean
  raw?: unknown
}
```

Provider adapter 必须把各平台错误转换成统一错误。

---

## 17. 安全设计

### 17.1 不在客户端暴露 provider secret

Web/RN 客户端不能直接持有：

- OpenRouter API Key
- ElevenLabs API Key
- Azure Speech Key
- Deepgram API Key
- 讯飞 Secret

需要后端生成：

```txt
临时 token
signed websocket url
short-lived session key
```

SDK 侧只接收业务后端返回的临时凭证。

---

### 17.2 Token Broker

业务项目需要实现：

```http
POST /api/voice/token
```

请求：

```json
{
  "provider": "elevenlabs_scribe_realtime",
  "purpose": "asr",
  "sessionId": "xxx"
}
```

返回：

```json
{
  "url": "wss://...",
  "token": "short_lived_token",
  "expiresAt": 1780000000000
}
```

SDK provider 调用 token broker，而不是直接读取 secret。

---

## 18. 构建与发布设计

### 18.1 package exports

`@voice-ai-sdk/core/package.json`：

```json
{
  "name": "@voice-ai-sdk/core",
  "version": "0.1.0",
  "type": "module",
  "main": "./dist/index.cjs",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js",
      "require": "./dist/index.cjs"
    }
  },
  "sideEffects": false
}
```

---

### 18.2 多入口示例

`@voice-ai-sdk/runtime-web/package.json`：

```json
{
  "name": "@voice-ai-sdk/runtime-web",
  "version": "0.1.0",
  "type": "module",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "peerDependencies": {
    "@voice-ai-sdk/core": "workspace:*"
  }
}
```

---

### 18.3 Bun build 脚本

```json
{
  "scripts": {
    "build": "bun run scripts/build.ts",
    "test": "bun test",
    "typecheck": "tsc -b",
    "dev": "bun run --watch examples/node-cli/index.ts"
  }
}
```

`scripts/build.ts`：

```ts
const packages = [
  'core',
  'runtime-web',
  'runtime-react-native',
  'provider-openrouter',
  'provider-elevenlabs',
  'provider-azure-speech',
]

for (const name of packages) {
  await Bun.build({
    entrypoints: [`packages/${name}/src/index.ts`],
    outdir: `packages/${name}/dist`,
    target: 'browser',
    format: 'esm',
    sourcemap: 'external',
    minify: false,
  })
}
```

> 注意：Node/RN/Web target 可能需要分别 build。第一版可以先 ESM-only，等发布 npm 后再补 CJS。

---

## 19. 示例：Web 使用方式

```ts
import { createVoiceSession } from '@voice-ai-sdk/core'
import { createWebRuntime } from '@voice-ai-sdk/runtime-web'
import { createElevenLabsASR } from '@voice-ai-sdk/provider-elevenlabs'
import { createAzureTTS } from '@voice-ai-sdk/provider-azure-speech'
import { createOpenRouterLLM } from '@voice-ai-sdk/provider-openrouter'

const runtime = createWebRuntime()

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createElevenLabsASR({
      tokenBrokerUrl: '/api/voice/token',
      model: 'scribe-realtime',
    }),
    llm: createOpenRouterLLM({
      tokenBrokerUrl: '/api/voice/token',
      model: 'google/gemini-2.5-flash-lite',
    }),
    tts: createAzureTTS({
      tokenBrokerUrl: '/api/voice/token',
      voice: 'en-US-JennyNeural',
    }),
  },
  policy: {
    silenceTimeoutMs: 1200,
    maxTurnDurationMs: 120_000,
    autoStartListening: true,
  },
})

session.on('statechange', (e) => {
  console.log('state:', e.from, '->', e.to)
})

session.on('asr_partial', (e) => {
  transcriptPreview.textContent = e.text
})

session.on('asr_final', (e) => {
  console.log('final:', e.text)
})

await session.start('Good morning. Let\'s talk about your work or studies.')
```

---

## 20. 示例：React Native / Expo 使用方式

```ts
import { createVoiceSession } from '@voice-ai-sdk/core'
import { createExpoRuntime } from '@voice-ai-sdk/runtime-react-native'
import { createElevenLabsASR } from '@voice-ai-sdk/provider-elevenlabs'
import { createOpenRouterLLM } from '@voice-ai-sdk/provider-openrouter'
import { createAzureTTS } from '@voice-ai-sdk/provider-azure-speech'

const runtime = createExpoRuntime()

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createElevenLabsASR({ tokenBrokerUrl: 'https://api.example.com/voice/token' }),
    llm: createOpenRouterLLM({
      tokenBrokerUrl: 'https://api.example.com/voice/token',
      model: 'google/gemini-2.5-flash-lite',
    }),
    tts: createAzureTTS({
      tokenBrokerUrl: 'https://api.example.com/voice/token',
      voice: 'en-US-GuyNeural',
    }),
  },
})

session.on('assistant_text', (e) => {
  setAssistantText(e.text)
})

session.on('asr_partial', (e) => {
  setUserTranscript(e.text)
})

await session.start('Hello. I am your speaking examiner.')
```

---

## 21. 示例：IELTS Plugin

### 21.1 Plugin 目标

`plugin-ielts` 不负责音频，只负责：

- 雅思口语 examiner prompt
- Part 1 / Part 2 / Part 3 流程
- 评分 prompt
- 输出 JSON schema
- 复练建议生成

---

### 21.2 使用方式

```ts
import { createIELTSSpeakingAgent } from '@voice-ai-sdk/plugin-ielts'

const ieltsAgent = createIELTSSpeakingAgent({
  part: 'part1',
  topic: 'work_and_study',
  targetBand: 6.5,
  feedbackLanguage: 'zh-CN',
})

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers,
  agent: ieltsAgent,
})

await session.start()
```

---

### 21.3 IELTS Agent Interface

```ts
export interface VoiceAgentPlugin {
  getInitialAssistantMessage(): Promise<string>
  generateNextAssistantMessage(input: AgentTurnInput): Promise<string>
  shouldFinishSession(input: AgentSessionInput): boolean
  generateReport?(input: AgentSessionInput): Promise<unknown>
}
```

---

### 21.4 IELTS Prompt 示例

```ts
export const IELTS_EXAMINER_SYSTEM_PROMPT = `
You are an IELTS Speaking examiner.

Rules:
- Ask one question at a time.
- Keep questions short and exam-like.
- Do not explain during the live test.
- Do not score during the live conversation.
- For Part 1, ask short personal questions.
- For Part 2, provide a cue card and timing instructions.
- For Part 3, ask abstract follow-up questions.
`
```

---

### 21.5 IELTS Scoring JSON

```ts
export interface IELTSSpeakingScoreReport {
  overallBand: number
  fluencyAndCoherence: IELTSCriterionScore
  lexicalResource: IELTSCriterionScore
  grammaticalRangeAndAccuracy: IELTSCriterionScore
  pronunciation: IELTSCriterionScore
  topProblems: string[]
  upgradedAnswerExamples: Array<{
    original: string
    upgraded: string
    reason: string
  }>
  nextPracticePlan: string[]
}

export interface IELTSCriterionScore {
  band: number
  reason: string
  evidence: string[]
  improvement: string[]
}
```

---

## 22. 示例：Barki Plugin

Barki 可能不是考试场景，而是更自由的 voice companion / assistant。

```ts
import { createBarkiVoiceAgent } from '@voice-ai-sdk/plugin-barki'

const barkiAgent = createBarkiVoiceAgent({
  persona: 'friendly_pet_companion',
  language: 'en',
  responseStyle: 'short',
})

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers,
  agent: barkiAgent,
})

await session.start()
```

Barki plugin 可以定义：

```txt
更短回答
更强情绪陪伴
更高频 TTS
更少评分逻辑
更多 session memory
```

---

## 23. Provider 实现示例：OpenRouter LLM

```ts
import { generateText, streamText } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import type { LLMProvider, LLMGenerateInput } from '@voice-ai-sdk/core'

export interface OpenRouterProviderOptions {
  apiKey?: string
  tokenBrokerUrl?: string
  model: string
}

export function createOpenRouterLLM(options: OpenRouterProviderOptions): LLMProvider {
  return {
    name: 'openrouter',

    async generate(input: LLMGenerateInput) {
      const apiKey = options.apiKey ?? await fetchOpenRouterToken(options.tokenBrokerUrl)
      const openrouter = createOpenRouter({ apiKey })

      const result = await generateText({
        model: openrouter(options.model),
        system: input.system,
        messages: input.messages,
        temperature: input.temperature ?? 0.7,
        maxOutputTokens: input.maxTokens,
      })

      return {
        text: result.text,
        usage: {
          inputTokens: result.usage?.inputTokens,
          outputTokens: result.usage?.outputTokens,
          totalTokens: result.usage?.totalTokens,
        },
        raw: result,
      }
    },
  }
}
```

---

## 24. Provider 实现示例：Mock ASR

用于测试，不依赖真实麦克风。

```ts
export function createMockASR(texts: string[]): ASRProvider {
  return {
    name: 'mock_asr',
    capabilities: {
      streaming: true,
      batch: false,
      partialResults: true,
      languages: ['en'],
    },

    async createSession() {
      let finalCb: ((r: ASRResult) => void) | undefined
      let partialCb: ((r: ASRResult) => void) | undefined
      let index = 0

      return {
        sendAudio() {
          const text = texts[index] ?? ''
          partialCb?.({ text: text.slice(0, Math.max(1, text.length / 2)) })
          finalCb?.({ text, confidence: 1 })
          index++
        },
        async stop() {},
        async close() {},
        onPartial(cb) {
          partialCb = cb
          return () => { partialCb = undefined }
        },
        onFinal(cb) {
          finalCb = cb
          return () => { finalCb = undefined }
        },
        onError() {
          return () => {}
        },
      }
    },
  }
}
```

---

## 25. Web Runtime 实现要点

### 25.1 音频采集

Web 优先：

```txt
getUserMedia
AudioContext
AudioWorklet
PCM 16k 转换
chunkMs = 100ms
```

第一版可以先做简化：

```txt
MediaRecorder + timeslice
```

但对于 streaming ASR，建议尽快上 AudioWorklet。

---

### 25.2 Web 音频播放

```txt
优先 audioUrl → HTMLAudioElement
其次 audioBuffer → AudioContext.decodeAudioData
```

---

## 26. React Native Runtime 实现要点

第一版建议基于 Expo：

```txt
expo-av / expo-audio 录音与播放
WebSocket 发送音频 chunk
FileSystem 处理临时音频
```

React Native 最大难点是实时 PCM chunk。可分阶段：

### Phase 1

```txt
短 chunk 录制 + 上传/发送
体验接近准实时，但不是 100ms 级别
```

### Phase 2

```txt
引入 native module 获取 PCM stream
```

### Phase 3

```txt
Swift / Kotlin 原生音频 runtime
```

---

## 27. Swift / Android Native 未来设计

TypeScript SDK 不直接编译成 Swift/Kotlin SDK。更现实的路线：

```txt
Core 协议稳定化
  ↓
通过 JSON-RPC / HTTP / WebSocket 定义协议
  ↓
Swift/Kotlin 实现 native runtime + provider client
```

也就是说，未来 Swift/Android 不是复用 TS runtime，而是复用：

- Provider API 规范
- Session 状态机设计
- Event 协议
- Voice Agent 协议

可以输出：

```txt
@voice-ai-sdk/protocol
```

里面定义 JSON schema。

---

## 28. Protocol 示例

```json
{
  "type": "statechange",
  "payload": {
    "from": "listening",
    "to": "user_speaking"
  }
}
```

```json
{
  "type": "asr_final",
  "payload": {
    "turnId": "turn_001",
    "text": "I currently work as a software engineer.",
    "confidence": 0.93
  }
}
```

```json
{
  "type": "assistant_text",
  "payload": {
    "turnId": "turn_002",
    "text": "What do you like most about your job?"
  }
}
```

---

## 29. Testing 策略

### 29.1 Unit Tests

测试：

- state transition
- provider router
- transcript buffer
- error normalization
- usage metering
- turn detector

---

### 29.2 Mock Provider Tests

每个 provider 必须有 mock：

```txt
mock_asr
mock_llm
mock_tts
mock_pronunciation
```

这样不消耗 API 费用。

---

### 29.3 Contract Tests

真实 provider 需要 contract test：

```txt
ELEVENLABS_API_KEY=xxx bun test providers/elevenlabs.contract.test.ts
AZURE_SPEECH_KEY=xxx bun test providers/azure.contract.test.ts
```

默认 CI 不跑 contract test。

---

## 30. MVP 开发计划

### Milestone 1：Core MVP

目标：能跑 mock session。

- core types
- event emitter
- state machine
- mock ASR/LLM/TTS
- usage snapshot
- node-cli example

---

### Milestone 2：Web MVP

目标：Web 页面可以准实时对话。

- runtime-web
- microphone permission
- audio capture
- ASR websocket adapter
- audio playback
- web-vite example

---

### Milestone 3：Provider MVP

目标：全球低成本链路可用。

- provider-openrouter
- provider-elevenlabs ASR
- provider-azure-speech TTS
- token broker example

---

### Milestone 4：IELTS Demo

目标：IELTS Speaking 可以集成。

- plugin-ielts
- Part 1 flow
- Part 2 cue card flow
- Part 3 follow-up flow
- scoring JSON
- report example

---

### Milestone 5：React Native MVP

目标：Expo App 可运行。

- runtime-react-native-expo
- permission
- record/playback
- RN example
- token broker remote mode

---

## 31. 推荐首版技术路线

### Global Budget Profile

```txt
ASR：ElevenLabs Scribe Realtime 或 Deepgram Streaming
LLM：OpenRouter Gemini Flash-Lite
TTS：Azure Neural TTS
Pronunciation：Approximation
```

### Global Pro Profile

```txt
ASR：Deepgram / ElevenLabs
LLM Conversation：Gemini Flash
LLM Scoring：OpenAI / Claude / Gemini Pro
TTS：ElevenLabs Flash
Pronunciation：Azure Pronunciation Assessment
```

### China Fallback Profile

```txt
ASR：讯飞 / 阿里
LLM：DeepSeek / Qwen
TTS：讯飞 / 阿里
Pronunciation：讯飞 / Approximation
```

---

## 32. 业务项目集成建议

### 32.1 IELTS Speaking

使用：

```txt
@voice-ai-sdk/core
@voice-ai-sdk/runtime-web
@voice-ai-sdk/provider-openrouter
@voice-ai-sdk/provider-elevenlabs
@voice-ai-sdk/provider-azure-speech
@voice-ai-sdk/plugin-ielts
```

产品层负责：

- topic selection
- session quota
- Paddle/订阅
- score report UI
- history
- user profile

---

### 32.2 Barki.app

使用：

```txt
@voice-ai-sdk/core
@voice-ai-sdk/runtime-web / runtime-react-native
@voice-ai-sdk/provider-openrouter
@voice-ai-sdk/provider-elevenlabs
@voice-ai-sdk/plugin-barki
```

产品层负责：

- persona
- memory
- conversation style
- session history
- app-specific prompt

---

## 33. 不建议一开始做的事情

1. 不要做 Swift/Android 原生 SDK。
2. 不要做 WebRTC。
3. 不要做 LiveKit 适配。
4. 不要做自托管 ASR/TTS。
5. 不要把所有 provider 一次接完。
6. 不要追求完美 VAD。
7. 不要在 SDK 内塞业务支付逻辑。
8. 不要在客户端保存 provider API key。

---

## 34. 第一版最小代码目标

第一版真正要跑通的是：

```txt
Web Demo:
  点击 Start
  ↓
  AI 播放一句话
  ↓
  自动开始听
  ↓
  用户说话
  ↓
  实时 transcript
  ↓
  自动判断结束
  ↓
  LLM 生成下一句
  ↓
  TTS 播放
  ↓
  循环
```

这就足够支撑 IELTS Speaking MVP 和 Barki 的早期语音体验。

---

## 35. 最终架构判断

这个 SDK 的核心价值不是“把某个 provider 接进来”，而是：

```txt
统一语音 AI 应用开发模型
  ↓
平台无关 runtime
  ↓
provider 可替换
  ↓
业务插件可复用
  ↓
多项目共享语音能力
```

对你来说，最重要的是：

- IELTS 不重复造语音链路。
- Barki 不重复造语音链路。
- 未来 App/Web/Native 都可以沿用同一套设计。
- 供应商价格/质量变化时，可以换 adapter，不重写业务。

一句话：

> 做一个 TypeScript-first 的半双工 Voice AI SDK。  
> Core 保持纯净，Runtime 适配平台，Provider 适配模型，Plugin 适配业务。
