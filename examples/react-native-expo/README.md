<p align="center">
  <img src="../../assets/brand/ottervoice-icon.webp" width="112" alt="OtterVoice pixel otter mascot" />
</p>

# OtterVoice React Native / Expo Demo

[中文](#中文) · [English](#english)

## 中文

这是 Expo SDK 57 的全双工 Audio LLM 示例。应用使用 16 kHz mono PCM 持续采集音频：

```text
原生 PCM 麦克风
  ├─→ 每轮一次终句 ASR → asr_final（仅字幕）
  └─→ VAD 完成整轮 WAV → Audio LLM → assistant_text_delta + PCM 分片播放
```

标准配置等待终句 ASR 后再请求 Audio LLM，避免被后续语音覆盖的轮次产生模型
费用；`asr_final` 同时负责修正屏幕上的最终用户字幕。服务端策略网关设置
Audio LLM 输出上限，客户端不能修改。

Demo 在服务端选择 OpenRouter、模型、system prompt、voice 与生成上限，但 UI、`VoiceSession` 和 Runtime 不依赖它。可以替换 ASR、LLM、TTS 或 Audio LLM Provider，而无需修改会话交互代码。客户端只看到 `/api/voice/{asr,llm,audio-llm}` profile，不包含 Provider 长期密钥、具体上游地址或业务策略。

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
```

这个值会进入客户端包，只能是你控制的服务端策略网关地址。不要在 `EXPO_PUBLIC_*` 中保存 Provider Key、prompt、model 或成本参数。网关实现必须提供 Demo 所用的兼容 profile 子路由并逐请求校验用户/会话；生产项目也可在 [`src/providers.ts`](src/providers.ts) 中组合其他 server-managed Provider Adapter。

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

This Expo SDK 57 example demonstrates full-duplex Audio LLM sessions with continuous 16 kHz mono PCM capture. Standard mode waits for authoritative final ASR before requesting the Audio LLM, avoiding spend on a turn superseded by later speech. It makes one final ASR request per turn; assistant captions update on `assistant_text_delta`, and PCM playback starts as chunks arrive. The server policy gateway owns the Audio LLM output ceiling; the client cannot change it.

The demo uses local-RMS hybrid turn detection and about 450 ms of local silence to submit a turn. Rolling ASR is off by default so the client cannot multiply provider calls. The server selects OpenRouter, models, system prompt, voice, and generation ceilings, while the UI, `VoiceSession`, and runtime remain provider-independent. Replace the server-managed adapters in [`src/providers.ts`](src/providers.ts) without changing session interaction code. The client sees only `/api/voice/{asr,llm,audio-llm}` profiles and contains no long-lived provider key, upstream URL, or business policy.

Run it with `bun run start`, scan the Expo Go QR code, or press `i` / `a`. `EXPO_PUBLIC_OTTERVOICE_API_URL` is required and must point to a policy gateway you control. The value is public by design; never place provider credentials, prompts, models, spend controls, or a shared gateway secret in an `EXPO_PUBLIC_*` variable. Pass the current user's short-lived application session header to `createMobileProviders()` after login.

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
