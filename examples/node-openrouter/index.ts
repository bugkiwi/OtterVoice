/**
 * Node example: a real LLM (OpenRouter) driving the conversation, with mocked
 * ASR/TTS and the in-memory runtime. The "user" audio is scripted; the assistant
 * replies come from the live model when OPENROUTER_API_KEY is set, and from a
 * mock LLM otherwise (so it runs in CI with no key or network).
 *
 *   OPENROUTER_API_KEY=sk-... bun run examples/node-openrouter/index.ts
 *   bun run examples/node-openrouter/index.ts            # mock fallback
 */
import {
  createMockASR,
  createMockLLM,
  createMockRuntime,
  createMockTTS,
  createVoiceSession,
  type LLMProvider,
} from '@ottervoice/core';
import { createOpenRouterLLM } from '@ottervoice/provider-openrouter';

const apiKey = process.env.OPENROUTER_API_KEY;
const llm: LLMProvider = apiKey
  ? createOpenRouterLLM({
      apiKey,
      model: process.env.OPENROUTER_MODEL ?? 'google/gemini-2.5-flash-lite',
      defaultTemperature: 0.7,
    })
  : createMockLLM({ reply: (i) => `（mock）你刚才说：${i.messages.at(-1)?.content ?? ''}` });

console.log(apiKey ? '🌐 Using live OpenRouter LLM' : '🧪 No OPENROUTER_API_KEY — using mock LLM');

const userTurns = [
  'Hi! Can you help me practice ordering coffee in English?',
  'I would like a large oat milk latte, please.',
  'Thank you, that is all.',
];

// A headless CLI has no real mic/speaker, so we drive the loop with the
// in-memory runtime; only the LLM is "real". (Use @ottervoice/runtime-node in
// app code when you need its fetch/WebSocket network or stream audio I/O.)
const runtime = createMockRuntime();

const session = createVoiceSession({
  mode: 'half_duplex',
  runtime,
  providers: {
    asr: createMockASR({ transcripts: userTurns }),
    llm,
    tts: createMockTTS(),
  },
});

session.on('asr_final', (e) => console.log(`🗣  ${e.text}`));
session.on('assistant_text', (e) => console.log(`🤖 ${e.text}\n`));
session.on('error', (e) => console.error('❌', e.code, e.message));

await session.start('Hello! I can help you practice English. What shall we work on?');

async function nextTurn(): Promise<void> {
  const back = new Promise<void>((resolve) => {
    const off = session.on('statechange', (e) => {
      if (e.to === 'listening') {
        off();
        resolve();
      }
    });
  });
  runtime.audioInput.emitChunk({ data: new ArrayBuffer(8), timestamp: Date.now(), durationMs: 1500 });
  await back;
}

for (let i = 0; i < userTurns.length; i += 1) await nextTurn();
await session.finish();

const usage = session.getUsage();
console.log(`📊 turns=${session.getTurns().length} llmIn=${usage.llmInputTokens ?? 0} llmOut=${usage.llmOutputTokens ?? 0}`);
