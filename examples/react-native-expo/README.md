<p align="center">
  <img src="../../assets/brand/ottervoice-icon.webp" width="112" alt="OtterVoice pixel otter mascot" />
</p>

# OtterVoice React Native / Expo Demo

[中文](#中文) · [English](#english)

## 中文

这是 Expo SDK 57 的全双工 Audio LLM 示例。应用使用 16 kHz mono PCM 持续采集音频：

```text
原生 PCM 麦克风
  ├─→ 流式 / 滚动 ASR → asr_partial（仅字幕）→ asr_final
  └─→ VAD 完成整轮 WAV → Audio LLM → assistant_text_delta + PCM 分片播放
```

Audio LLM 与终句 ASR 并行请求，降低停顿到首个音频分片的延迟；`asr_final`
仍负责修正屏幕上的最终用户字幕。
示例不设置 `audioLlmMaxTokens`：音频与字幕共享输出 token 预算，较小上限会直接截断语音。

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

点击“开始语音对话”后会请求麦克风权限。输入字幕在识别到 partial 后原位更新；助手字幕和 PCM 音频在模型返回分片时立即更新。示例使用 hybrid 轮次检测：本地 RMS 负责快速触发，滚动 ASR 可以确认未越过固定阈值的轻声输入，随后约 450 ms 本地静音提交轮次。

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
在仓库 Actions Variables 中设置公开变量 `OTTERVOICE_API_URL`；未设置时使用 Demo
内置的 `https://ottervoice.vercel.app/api/voice`。iOS 真机包仍需 Apple 签名和设备注册，
应使用 EAS Internal Distribution 或 TestFlight，而不是公开 IPA 下载链接。

实现入口：

- [`src/App.tsx`](src/App.tsx)：会话、增量 UI、双语文案与延迟指标；
- [`src/expo-adapters.ts`](src/expo-adapters.ts)：Expo PCM 输入与连续分片播放；
- [`src/providers.ts`](src/providers.ts)：Demo 的 Provider 组合与服务端网关；
- [`src/i18n.ts`](src/i18n.ts)：中英文文案。

## English

This Expo SDK 57 example demonstrates full-duplex Audio LLM sessions with continuous 16 kHz mono PCM capture. Once VAD finalizes the user audio, the Audio LLM request starts in parallel with authoritative caption ASR. Input captions update on `asr_partial` and are corrected by `asr_final`; assistant captions update on `assistant_text_delta`, and PCM playback starts as chunks arrive. The example leaves `audioLlmMaxTokens` unset because audio and transcript share the output-token budget, so a small cap truncates speech.

The demo uses hybrid turn detection: local RMS provides the fast path, rolling ASR can confirm quiet speech that stays below the fixed threshold, and about 450 ms of local silence then submits the turn. It currently selects an OpenRouter adapter on the server, but its UI, `VoiceSession`, and runtime are provider-independent. Replace the ASR, LLM, TTS, or Audio LLM adapters in [`src/providers.ts`](src/providers.ts) without changing session interaction code. The client sees only a generic `/api/voice` gateway and contains no long-lived provider key or upstream URL.

Run it with `bun run start`, scan the Expo Go QR code, or press `i` / `a`. Configure `EXPO_PUBLIC_OTTERVOICE_API_URL` only with a gateway you control. The value is public by design; never place provider credentials in an `EXPO_PUBLIC_*` variable.

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

Set the public Actions variable `OTTERVOICE_API_URL` to replace the bundled Demo
gateway. The APK uses Expo template debug signing and is for direct preview
installation only, not Google Play. iOS device distribution still requires
Apple signing and should use EAS Internal Distribution or TestFlight.
