/**
 * Node example: one unified audio-turn session whose backend is composed from
 * a scripted ASR result, a real OpenRouter text LLM, and mock TTS. The fallback
 * uses a fully mocked audio-turn provider, so the example also runs in CI.
 *
 *   OPENROUTER_API_KEY=sk-... bun run examples/node-openrouter/index.ts
 *   bun run examples/node-openrouter/index.ts            # mock fallback
 */
import {
  createMockAudioLLM,
  createMockRuntime,
  createMockTTS,
  createVoiceSession,
  type AudioLLMProvider,
} from '@ottervoice/core';
import { createOpenRouterLLM } from '@ottervoice/provider-openrouter';

const userTurns = [
  'Hi! Can you help me practice ordering coffee in English?',
  'I would like a large oat milk latte, please.',
  'Thank you, that is all.',
];

const apiKey = process.env.OPENROUTER_API_KEY;
let inputIndex = 0;
const audioLlm: AudioLLMProvider = apiKey
  ? (() => {
      const llm = createOpenRouterLLM({
        apiKey,
        model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite',
        defaultTemperature: 0.7,
      });
      const tts = createMockTTS();
      return {
        name: 'openrouter_composite_audio_turn',
        transcribesInput: true,
        async generate(input) {
          const inputText = userTurns[inputIndex] ?? '';
          inputIndex += 1;
          await input.onInputTranscript?.(inputText);
          const reply = await llm.generate({
            messages: [
              ...input.messages,
              { role: 'user', content: inputText },
            ],
            signal: input.signal,
          });
          await input.onTranscriptDelta?.(reply.text);
          const speech = await tts.synthesize({
            text: reply.text,
            format: 'mp3',
            signal: input.signal,
          });
          return {
            inputText,
            text: reply.text,
            audioBuffer: speech.audioBuffer ?? new ArrayBuffer(0),
            mimeType: speech.mimeType,
            usage: reply.usage,
          };
        },
      };
    })()
  : createMockAudioLLM({
      inputTranscripts: userTurns,
      reply: (_input, _callIndex, inputText) => `（mock）你刚才说：${inputText}`,
    });

console.log(
  apiKey
    ? '🌐 Using a server-style ASR → OpenRouter LLM → TTS audio-turn provider'
    : '🧪 No OPENROUTER_API_KEY — using mock audio turns',
);

// A headless CLI has no real mic/speaker, so the input transcript and output
// audio are synthetic. Both native and composite production backends expose
// the same AudioLLMProvider contract used here.
const runtime = createMockRuntime();
const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: { audioLlm },
});

session.on('asr_final', (event) => console.log(`🗣  ${event.text}`));
session.on('assistant_text', (event) => console.log(`🤖 ${event.text}\n`));
session.on('error', (event) => console.error('❌', event.code, event.message));

await session.start();

async function nextTurn(): Promise<void> {
  const back = new Promise<void>((resolve) => {
    const off = session.on('statechange', (event) => {
      if (event.to === 'listening') {
        off();
        resolve();
      }
    });
  });
  runtime.audioInput.emitChunk({
    data: new ArrayBuffer(8),
    timestamp: Date.now(),
    durationMs: 1500,
  });
  await session.endUserTurn();
  await back;
}

for (let i = 0; i < userTurns.length; i += 1) await nextTurn();
await session.finish();

const usage = session.getUsage();
console.log(
  `📊 turns=${session.getTurns().length} llmIn=${usage.llmInputTokens ?? 0} llmOut=${usage.llmOutputTokens ?? 0}`,
);
