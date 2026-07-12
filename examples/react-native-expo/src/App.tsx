/**
 * Illustrative Expo screen driving an OtterVoice half-duplex session.
 *
 * Recording is push-to-talk (Expo records to a file): tap "Speak" to start the
 * turn, tap "Done" to finish it. Cognition here is mocked; point the providers
 * at your token broker for real ASR/LLM/TTS.
 */
import { useRef, useState } from 'react';
import { Button, ScrollView, Text, View } from 'react-native';
import {
  createMockLLM,
  createVoiceSession,
  type ASRProvider,
  type VoiceSession,
} from '@ottervoice/core';
import { createExpoAudioRuntime } from './expo-adapters';

/** Demo ASR: emits a scripted transcript when a turn ends. */
function createDemoASR(lines: string[]): ASRProvider {
  let i = 0;
  return {
    name: 'demo_asr',
    capabilities: { streaming: true, batch: false, partialResults: false, languages: ['en'] },
    async createSession() {
      let onFinal: ((r: { text: string }) => void) | undefined;
      return {
        sendAudio() {},
        async stop() {
          onFinal?.({ text: lines[i++] ?? 'Thanks!' });
        },
        async close() {},
        onPartial: () => () => {},
        onFinal: (cb) => {
          onFinal = cb;
          return () => {};
        },
        onError: () => () => {},
      };
    },
  };
}

export default function App() {
  const [state, setState] = useState('idle');
  const [log, setLog] = useState<string[]>([]);
  const sessionRef = useRef<VoiceSession | null>(null);
  const append = (line: string) => setLog((prev) => [...prev, line]);

  async function start() {
    const session = createVoiceSession({
      mode: 'push_to_talk',
      runtime: createExpoAudioRuntime(),
      providers: {
        asr: createDemoASR(['I want to practice introductions.', 'My name is Sam.']),
        llm: createMockLLM({ reply: (i) => `You said: ${i.messages.at(-1)?.content ?? ''}` }),
        // tts: createAzureTTS({ tokenBrokerUrl: 'https://api.example.com/api/voice/token', region: '...', voice: '...' }),
      },
      policy: { autoStartListening: true },
    });
    session.on('statechange', (e) => setState(e.to));
    session.on('asr_final', (e) => append(`🗣 ${e.text}`));
    session.on('assistant_text', (e) => append(`🤖 ${e.text}`));
    sessionRef.current = session;
    await session.start('Hi! Tell me a bit about yourself.');
  }

  return (
    <View style={{ flex: 1, padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 20, fontWeight: '600' }}>🦦 OtterVoice — Expo</Text>
      <Text>State: {state}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title="Start" onPress={start} />
        <Button title="Done" onPress={() => sessionRef.current?.endUserTurn()} />
        <Button title="End" onPress={() => sessionRef.current?.finish()} />
      </View>
      <ScrollView style={{ flex: 1 }}>
        {log.map((line, idx) => (
          <Text key={idx} style={{ marginVertical: 4 }}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}
