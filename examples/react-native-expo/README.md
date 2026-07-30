<p align="center">
  <img src="../../assets/brand/ottervoice-icon.webp" width="112" alt="OtterVoice pixel otter mascot" />
</p>

# OtterVoice React Native / Expo Demo

[中文](#中文) · [English](#english)

## 中文

这是 Expo SDK 57 的全双工统一 audio-turn 示例。应用使用 16 kHz mono PCM
持续采集音频，客户端始终只装配一个 `AudioLLMProvider`：

```text
原生 PCM 麦克风 → 本地 VAD → 整轮 WAV → AudioLLMProvider
                                          ├─ 复合：服务端 ASR → LLM → TTS（默认）
                                          └─ 原生：上游 Audio LLM
                                                + 可选独立 ASR（仅用户字幕）
```

默认 `composite` 后端通过 `/asr-llm-tts` 发起一次请求，在同一 SSE 响应里返回
输入转写、助手文本与音频。`native` 后端通过 `/audio-llm` 调用原生语音模型，另用
`/asr` 生成可选用户字幕。两条后端通路对 `VoiceSession`、Runtime、UI 和生命周期
完全一致，不再存在客户端 ASR / LLM / TTS 三 Provider 会话配置。

示例使用 `audioLlmStartTiming: 'after_audio'`：VAD 完成整轮 WAV 后立即请求
audio-turn。原生后端的可选字幕 ASR 与回复并行；复合后端则由同一次请求回传输入
转写。服务端负责 OpenRouter、模型、system prompt、voice 与生成上限，客户端不包含
Provider 长期密钥、具体上游地址或业务策略。
应用会把当前界面语言作为白名单 `x-ottervoice-language: zh|en` 请求头发送给网关，
由服务端选择对应语言的 system prompt。语言切换在会话期间锁定，避免界面语言与
当前会话策略不一致；客户端仍不会接收或保存 prompt 内容。

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

点击“开始语音对话”后会请求麦克风权限。输入字幕在终句识别后更新；助手字幕和 PCM 音频在模型返回分片时立即更新。标准配置关闭滚动 ASR，避免客户端提高请求频率；hybrid 轮次检测使用本地 RMS 触发，随后约 450 ms 本地静音提交轮次。

### 网关配置

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_OTTERVOICE_API_URL=https://your-domain.example/api/voice
EXPO_PUBLIC_OTTERVOICE_BACKEND=composite
```

这些值会进入客户端包，URL 只能指向你控制的服务端策略网关。不要在
`EXPO_PUBLIC_*` 中保存 Provider Key、prompt、model 或成本参数。网关实现必须提供
Demo 所用的兼容 profile 子路由并逐请求校验用户 / 会话；生产项目也可在
[`src/providers.ts`](src/providers.ts) 中组合其他 server-managed Provider Adapter。

`EXPO_PUBLIC_OTTERVOICE_BACKEND` 可设为 `composite`（默认，单次服务端复合请求）
或 `native`（原生 Audio LLM + 可选字幕 ASR）。这只改变后端实现，不改变 Session
配置和应用事件处理。

### 移动端生命周期

- App 离开 `active` 时，示例会 `finish('app_background')` 并 `dispose()` 当前会话，
  停止麦克风、网络请求和播放；回到前台后由用户显式重新开始。
- Runtime 使用代际令牌处理异步 `start()` / `stop()` 竞态，后台切换或快速重启不会让
  延迟完成的麦克风或播放器重新启动。
- 整段音频与 PCM 分片产生的缓存文件会在播放结束、取消或失败后尽力清理。

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

### GitHub Release Android 安装包

仓库的 `React Native Android Release` 工作流会在 GitHub Runner 上执行
Expo prebuild 和 Gradle release 构建，不占用 EAS Build 额度。它可以通过两种方式启动：

- 推送与应用版本一致的 `rn-v*` 标签，例如 `rn-v0.2.0`；
- 在 GitHub Actions 中手动运行，并输入与 `app.json`、`package.json` 一致的版本号。

每次成功发布都会创建或更新两类 GitHub Release：`rn-v*` 保存不可变的版本 APK，
`rn-latest` 保存供二维码使用的固定名 APK；两者都附带 SHA-256 校验文件：

```text
latest  https://github.com/bugkiwi/OtterVoice/releases/download/rn-latest/ottervoice-demo-android.apk
version https://github.com/bugkiwi/OtterVoice/releases/download/rn-v0.2.0/ottervoice-demo-android-0.2.0.apk
```

Web 展示页的二维码只编码专用的 `rn-latest` 地址，因此无需随版本更新，也不会被
仓库中其他类型的 Release 影响。工作流使用 Expo
模板的 debug signing 构建可安装体验包，不应上传 Google Play。需要替换语音网关时，
必须在仓库 Actions Variables 中设置公开变量 `OTTERVOICE_API_URL`，未配置时发布
工作流会直接失败，不再回退到匿名公共网关。iOS 真机包仍需 Apple 签名和设备注册，
应使用 EAS Internal Distribution 或 TestFlight，而不是公开 IPA 下载链接。

实现入口：

- [`src/App.tsx`](src/App.tsx)：会话、增量 UI、双语文案与延迟指标；
- [`src/expo-adapters.ts`](src/expo-adapters.ts)：Expo PCM 输入与连续分片播放；
- [`src/providers.ts`](src/providers.ts)：Demo 的 Provider 组合与服务端网关；
- [`src/i18n.ts`](src/i18n.ts)：中英文文案。

## English

This Expo SDK 57 example demonstrates full-duplex sessions through one unified
audio-turn contract. The client always supplies one `AudioLLMProvider`. The
default `composite` backend sends the turn to `/asr-llm-tts`, where the server
runs ASR → LLM → TTS and returns the input transcript, assistant text, and audio
in one SSE response. The `native` backend uses `/audio-llm` plus optional `/asr`
for user captions. Neither choice changes the `VoiceSession`, runtime, UI, or
lifecycle code; there is no client three-provider session path.

The demo uses local-RMS hybrid turn detection and about 450 ms of local silence
to submit a complete WAV. With `audioLlmStartTiming: 'after_audio'`, native
caption ASR runs in parallel with reply generation; the composite route returns
its own input transcript. The server owns models, prompts, voices, and generation
ceilings. The client contains no long-lived provider key, upstream URL, or
business policy.

Run it with `bun run start`, scan the Expo Go QR code, or press `i` / `a`.
`EXPO_PUBLIC_OTTERVOICE_API_URL` is required and must point to a policy gateway
you control. Set `EXPO_PUBLIC_OTTERVOICE_BACKEND` to `composite` (default) or
`native`. These values are public by design; never place provider credentials,
prompts, models, spend controls, or a shared gateway secret in an
`EXPO_PUBLIC_*` variable. Pass the current user's short-lived application
session header to `createMobileProviders()` after login. The app also sends the
allowlisted `x-ottervoice-language: zh|en` preference so the gateway can choose
the matching server-owned system prompt. The language control is locked during
an active session to keep the interface and response policy aligned.

When the app leaves the active state, the example finishes and disposes the
session, stopping capture, requests, and playback. Returning to the foreground
requires an explicit restart. The runtime cancels microphone/player setup that
finishes after `stop()` and best-effort deletes temporary playback files.

The current mobile VAD submits after roughly 450 ms of silence. Treat that as a low-latency starting point and test it on target devices, noisy input, speaker playback, real barge-in, and false-interruption recovery before release.

### GitHub Release Android APK

The `React Native Android Release` workflow runs Expo prebuild and Gradle on a
GitHub-hosted runner, so it does not consume EAS Build minutes. Trigger it with
an `rn-v*` tag such as `rn-v0.2.0`, or run it manually with a version matching
both `app.json` and `package.json`.

Each run publishes an immutable version URL and updates the dedicated
`rn-latest` alias used by the website QR code:

```text
latest  https://github.com/bugkiwi/OtterVoice/releases/download/rn-latest/ottervoice-demo-android.apk
version https://github.com/bugkiwi/OtterVoice/releases/download/rn-v0.2.0/ottervoice-demo-android-0.2.0.apk
```

Set the public Actions variable `OTTERVOICE_API_URL`; the workflow fails closed
when it is missing rather than bundling an anonymous public gateway. The APK uses Expo template debug signing and is for direct preview
installation only, not Google Play. iOS device distribution still requires
Apple signing and should use EAS Internal Distribution or TestFlight.
