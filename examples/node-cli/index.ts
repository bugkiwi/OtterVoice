/**
 * Node CLI demo — runs a fully mocked half-duplex voice session end to end,
 * with no microphone, network, or API keys. It exercises the same code path a
 * real app would, just with mock providers and an in-memory runtime.
 *
 *   bun run examples/node-cli/index.ts
 */
import {
  createMockASR,
  createMockLLM,
  createMockRuntime,
  createMockTTS,
  createVoiceSession,
} from '@ottervoice/core';

const scriptedUserUtterances = [
  'I currently work as a software engineer.',
  'I enjoy solving hard problems and learning new things.',
  'Thanks, that was a great chat!',
];

const runtime = createMockRuntime();

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createMockASR({ transcripts: scriptedUserUtterances }),
    llm: createMockLLM({
      reply: (input) => {
        const last = input.messages.at(-1)?.content ?? '';
        return `Interesting — tell me more about: "${last}"`;
      },
    }),
    tts: createMockTTS(),
  },
  policy: { autoStartListening: true },
});

session.on('statechange', (e) => {
  console.log(`  [state] ${e.from} -> ${e.to}`);
});
session.on('assistant_text', (e) => console.log(`🤖 ${e.text}`));
session.on('asr_partial', (e) => console.log(`   …${e.text}`));
session.on('asr_final', (e) => console.log(`🗣  ${e.text}`));
session.on('finished', () => console.log('\n✅ Session finished.'));
session.on('error', (e) => console.error('❌ error:', e.code, e.message));

await session.start('Good morning! Tell me about your work.');

// Emit one audio chunk per user utterance and wait for the assistant to reply
// and re-open the mic (state returns to "listening") before the next one.
async function userSpeaks(): Promise<void> {
  const backToListening = new Promise<void>((resolve) => {
    const off = session.on('statechange', (e) => {
      if (e.to === 'listening') {
        off();
        resolve();
      }
    });
  });
  runtime.audioInput.emitChunk({
    data: new ArrayBuffer(8),
    timestamp: Date.now(),
    durationMs: 1200,
  });
  await backToListening;
}

for (let i = 0; i < scriptedUserUtterances.length; i += 1) {
  await userSpeaks();
}

await session.finish();

const usage = session.getUsage();
console.log('\n📊 Usage:');
console.log(`   turns:             ${session.getTurns().length}`);
console.log(`   assistant chars:   ${usage.assistantSpeechChars}`);
console.log(`   tts chars:         ${usage.ttsChars}`);
console.log(`   asr audio ms:      ${usage.asrAudioMs}`);
console.log(`   llm input tokens:  ${usage.llmInputTokens ?? 0}`);
console.log(`   llm output tokens: ${usage.llmOutputTokens ?? 0}`);
