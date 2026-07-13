/**
 * Live latency benchmark for the two web-example pipelines.
 *
 * OPENROUTER_API_KEY=... bun run examples/web/benchmark.ts [audio.mp3]
 */
import {
  createOpenRouterASR,
  createOpenRouterAudioLLM,
  createOpenRouterLLM,
  createOpenRouterTTS,
} from '@ottervoice/provider-openrouter';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

const inputPath = process.argv[2] ?? 'docs/site/dist/opening.mp3';
const input = await Bun.file(inputPath).arrayBuffer();
const runs = Number(process.env.BENCHMARK_RUNS ?? 3);
const system =
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复。' +
  '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';
const options = { apiKey, title: 'OtterVoice Latency Benchmark' };
const llm = createOpenRouterLLM({
  ...options,
  model: 'deepseek/deepseek-v4-flash:nitro',
  defaultTemperature: 0.45,
  reasoningEnabled: false,
});
const tts = createOpenRouterTTS({
  ...options,
  model: 'hexgrad/kokoro-82m',
  voice: 'zf_xiaoxiao',
  speed: 1.05,
});
const audioLlm = createOpenRouterAudioLLM({
  ...options,
  model: 'openai/gpt-audio-mini',
  voice: 'alloy',
  defaultTemperature: 0.45,
});

async function transcribe(): Promise<{ text: string; cost: number }> {
  const asr = createOpenRouterASR({
    ...options,
    model: 'qwen/qwen3-asr-flash-2026-02-10',
    format: 'mp3',
  });
  const session = await asr.createSession({});
  const result = new Promise<{ text: string; cost: number }>((resolve, reject) => {
    session.onFinal((value) => resolve({
      text: value.text,
      cost: Number((value.raw as { usage?: { cost?: number } } | undefined)?.usage?.cost ?? 0),
    }));
    session.onError(reject);
  });
  await session.sendAudio(input);
  await session.stop();
  return result;
}

async function benchmarkCascade() {
  const startedAt = performance.now();
  const transcript = await transcribe();
  const asrAt = performance.now();
  const reply = await llm.generate({
    system,
    messages: [{ role: 'user', content: transcript.text }],
    maxTokens: 80,
    temperature: 0.45,
  });
  const llmAt = performance.now();
  await tts.synthesize({ text: reply.text, format: 'mp3' });
  const finishedAt = performance.now();
  return {
    readyMs: finishedAt - startedAt,
    asrMs: asrAt - startedAt,
    llmMs: llmAt - asrAt,
    ttsMs: finishedAt - llmAt,
    costUsd:
      transcript.cost +
      Number((reply.raw as { usage?: { cost?: number } } | undefined)?.usage?.cost ?? 0) +
      reply.text.length * 0.62 / 1_000_000,
  };
}

async function benchmarkAudioLlm() {
  const startedAt = performance.now();
  const caption = transcribe();
  const reply = await audioLlm.generate({
    audio: input,
    format: 'mp3',
    messages: [],
    system,
    maxTokens: 80,
    temperature: 0.45,
  });
  const readyAt = performance.now();
  const captionResult = await caption;
  const finishedAt = performance.now();
  const raw = reply.raw as { firstAudioAtMs?: number } | undefined;
  return {
    readyMs: readyAt - startedAt,
    firstAudioMs: raw?.firstAudioAtMs,
    captionReadyMs: finishedAt - startedAt,
    costUsd:
      captionResult.cost +
      Number((reply.raw as { usage?: { cost?: number } } | undefined)?.usage?.cost ?? 0),
  };
}

const cascade = [];
const audio = [];
for (let i = 0; i < runs; i += 1) {
  cascade.push(await benchmarkCascade());
  audio.push(await benchmarkAudioLlm());
}

const average = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;
const oldAverage = average(cascade.map((run) => run.readyMs));
const newAverage = average(audio.map((run) => run.readyMs));
console.log(JSON.stringify({
  input: inputPath,
  runs,
  cascade,
  audioLlm: audio,
  summary: {
    cascadeReadyMs: Math.round(oldAverage),
    audioLlmReadyMs: Math.round(newAverage),
    savedMs: Math.round(oldAverage - newAverage),
    speedup: Number((oldAverage / newAverage).toFixed(2)),
    cascadeAverageCostUsd: average(cascade.map((run) => run.costUsd)),
    audioLlmAverageCostUsd: average(audio.map((run) => run.costUsd)),
  },
}, null, 2));
