# OtterVoice React Native / Expo demo

A runnable Expo SDK 57 full-duplex Audio LLM example. It follows the same path
and conversation policy as `examples/web`:

```text
native PCM microphone (16 kHz mono)
  ├─→ Qwen3 ASR → transcript events
  └─→ GPT Audio Mini SSE → PCM chunks → Expo AudioPlaylist
                                      ↘ keep listening for barge-in
```

The app never contains an OpenRouter key. By default it calls the production
proxy at:

```text
https://ottervoice.vercel.app/api/openrouter
```

## Scan and run with Expo Go

From the repository root:

```bash
bun install
cd examples/react-native-expo
bun run start
```

Scan the terminal QR code with Expo Go, or press `i` / `a` to open a local iOS
simulator or Android emulator. If a simulator cannot reach `localhost`, use:

```bash
bunx expo start --go --lan
```

The first tap on **Start voice session** requests microphone access. A pause of
about one second submits the current turn. The microphone remains active while
the model thinks and speaks; roughly 200 ms of strong foreground speech can
interrupt playback, including short Chinese and English commands.

## Configuration

Copy the optional environment file when you need a different server:

```bash
cp .env.example .env
```

```dotenv
EXPO_PUBLIC_OTTERVOICE_API_URL=https://ottervoice.vercel.app/api/openrouter
```

This value is public by design and must point to a server-side proxy or token
broker. Never put provider credentials in an `EXPO_PUBLIC_*` variable.

## Validate and compile locally

```bash
bun run typecheck
bun run export               # bundle both iOS and Android
bun run build:ios:local      # generate, compile, and install the native iOS app
bun run build:android:local  # generate, compile, and install the native Android app
```

Generated `ios/`, `android/`, `.expo/`, and `dist/` directories are ignored.

Expo SDK 57 requires Xcode 26.4 or newer for a local native iOS build. Expo Go
can still run the JavaScript bundle on older local toolchains; the checked-in
EAS profiles pin iOS builds to Expo's compatible `sdk-57` image. See Expo's
[SDK compatibility table](https://docs.expo.dev/versions/latest/) and
[EAS build infrastructure](https://docs.expo.dev/build-reference/infrastructure/).

## Produce installable demo packages

After signing in to an Expo account and linking the EAS project once with
`eas init`, the included `eas.json` profiles produce QR-installable artifacts:

```bash
bun run build:ios:simulator   # .app archive for an iOS simulator
bun run build:android:preview # installable Android APK
bun run build:preview         # internal-distribution builds for both platforms
```

EAS prints a build page and QR code when a device-installable artifact is
ready. Use `development-simulator` for a dev client and `preview-simulator` for
a standalone iOS simulator build.

## Implementation map

- `src/App.tsx` — full-duplex session, bilingual UI, transcript and latency.
- `src/expo-adapters.ts` — Expo native PCM input, gapless chunk playlist, cache
  files and cleanup.
- `src/providers.ts` — production proxy plus GPT Audio Mini and Qwen3 ASR.
- `src/i18n.ts` — Chinese and English application copy.
- `eas.json` — development, simulator, preview APK and production profiles.

The runtime stays platform-neutral: `@ottervoice/runtime-react-native` receives
small injected Expo interfaces, while `@ottervoice/core` owns VAD turn-taking,
barge-in, cancellation and false-interruption recovery.
