# @ottervoice/runtime-react-native

React Native and Expo runtime adapter for OtterVoice recording and gapless PCM
playback.

## Install

```bash
npm install @ottervoice/core @ottervoice/runtime-react-native
```

## Usage

```ts
import { createExpoRuntime } from '@ottervoice/runtime-react-native';

const runtime = createExpoRuntime({
  input: audioInputBindings,
  output: audioOutputBindings,
});
```

Native capture and playback primitives are injected so the runtime has no hard
dependency on a particular Expo audio library. See the repository's
`examples/react-native-expo` app for a complete integration.

## Links

[Documentation](https://ottervoice.vercel.app/docs/) ·
[React Native example](https://github.com/bugkiwi/OtterVoice/tree/main/examples/react-native-expo) ·
[GitHub](https://github.com/bugkiwi/OtterVoice)

## License

MIT
