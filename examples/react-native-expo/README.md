# React Native (Expo) example

Illustrative wiring for `@ottervoice/runtime-react-native`. It is **not run from
this repo** — copy the two files into a real Expo app.

```bash
npx create-expo-app my-voice-app
cd my-voice-app
npx expo install expo-av expo-file-system
npm install @ottervoice/core @ottervoice/runtime-react-native
# copy src/expo-adapters.ts and src/App.tsx into your app
npx expo start
```

- `src/expo-adapters.ts` — bridges `expo-av` (`Audio.Recording` / `Audio.Sound`)
  and `expo-file-system` to the injected interfaces OtterVoice expects.
- `src/App.tsx` — a push-to-talk screen (Expo records to a file, so each turn is
  start → "Done"). Replace the demo ASR / mock LLM with real providers behind a
  token broker for production.

Streaming PCM (AudioWorklet-equivalent) is a later phase; today the Expo input
emits one audio chunk per record/stop cycle.
