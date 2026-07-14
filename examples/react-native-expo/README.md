# OtterVoice React Native / Expo Demo

[中文](#中文) · [English](#english)

## 中文

这是 Expo SDK 57 的全双工 Audio LLM 示例。应用使用 16 kHz mono PCM 持续采集音频：

```text
原生 PCM 麦克风
  └─→ 流式 / 滚动 ASR → asr_partial（仅字幕）→ asr_final
                                                └─→ Audio LLM → assistant_text_delta + PCM 分片播放
```

Demo 当前在服务端选择 OpenRouter 适配器，但 UI、`VoiceSession` 和 Runtime 不依赖它。可以替换 ASR、LLM、TTS 或 Audio LLM Provider，而无需修改会话交互代码。客户端只看到通用 `/api/voice` 网关，不包含 Provider 长期密钥或具体上游地址。

### 运行

```bash
bun install
cd examples/react-native-expo
bun run start
```

使用 Expo Go 扫描二维码，或按 `i` / `a` 打开本地模拟器。模拟器无法访问 localhost 时：

```bash
bunx expo start --go --lan
```

点击“开始语音对话”后会请求麦克风权限。输入字幕在识别到 partial 后原位更新；助手字幕和 PCM 音频在模型返回分片时立即更新。当前移动端 VAD 在约 450 ms 静音后提交轮次，实际产品应针对目标设备与噪声环境调参。

### 网关配置

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_OTTERVOICE_API_URL=https://your-domain.example/api/voice
```

这个值会进入客户端包，只能是你控制的服务端网关或短期令牌服务地址。不要在 `EXPO_PUBLIC_*` 中保存 Provider Key。网关实现必须提供 Demo 所用的兼容子路由；生产项目也可在 [`src/providers.ts`](src/providers.ts) 中组合其他 Provider Adapter。

### 验证与构建

```bash
bun run typecheck
bun run export
bun run build:ios:local
bun run build:android:local
```

需要 EAS 构建时：

```bash
bun run build:ios:simulator
bun run build:android:preview
bun run build:preview
```

实现入口：

- [`src/App.tsx`](src/App.tsx)：会话、增量 UI、双语文案与延迟指标；
- [`src/expo-adapters.ts`](src/expo-adapters.ts)：Expo PCM 输入与连续分片播放；
- [`src/providers.ts`](src/providers.ts)：Demo 的 Provider 组合与服务端网关；
- [`src/i18n.ts`](src/i18n.ts)：中英文文案。

## English

This Expo SDK 57 example demonstrates full-duplex Audio LLM sessions with continuous 16 kHz mono PCM capture. Input captions update on `asr_partial`, but generation starts only after `asr_final` confirms the turn. Assistant captions update on `assistant_text_delta`; PCM playback starts as chunks arrive.

The demo currently selects an OpenRouter adapter on the server, but its UI, `VoiceSession`, and runtime are provider-independent. Replace the ASR, LLM, TTS, or Audio LLM adapters in [`src/providers.ts`](src/providers.ts) without changing session interaction code. The client sees only a generic `/api/voice` gateway and contains no long-lived provider key or upstream URL.

Run it with `bun run start`, scan the Expo Go QR code, or press `i` / `a`. Configure `EXPO_PUBLIC_OTTERVOICE_API_URL` only with a gateway you control. The value is public by design; never place provider credentials in an `EXPO_PUBLIC_*` variable.

The current mobile VAD submits after roughly 450 ms of silence. Treat that as a low-latency starting point and test it on target devices, noisy input, speaker playback, real barge-in, and false-interruption recovery before release.
