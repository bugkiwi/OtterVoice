/**
 * End-to-end Audio LLM story test (OpenRouter gpt-audio-mini SSE path).
 *
 * Uses the same request shape as `createOpenRouterAudioLLM` (pcm16 stream,
 * base64 join, WAV wrap) but sends the query as plain text for easy CLI use.
 *
 *   cd examples/web
 *   bun run test:audio-story
 *   bun run test:audio-story -- "自定义问题"
 *
 * Outputs under `examples/web/out/audio-story-<timestamp>/`:
 *   transcript.txt  — streamed transcript
 *   audio.wav       — assembled PCM16 → WAV
 *   audio.mp3       — if ffmpeg is installed
 *   meta.json       — timings, token usage, chunk stats
 */
import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pcm16ToWav } from '../../packages/provider-openrouter/src/audio-llm';
import { parseSSEStream } from '../../packages/provider-utils/src/sse';

const DEFAULT_QUERY = '你可以讲一个我的世界的冒险故事吗？我希望有800个字这么长';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required (set in repo .env)');

const query = process.argv.slice(2).join(' ').trim() || DEFAULT_QUERY;
const model = process.env.AUDIO_LLM_MODEL ?? 'openai/gpt-audio-mini';
const voice = (process.env.AUDIO_LLM_VOICE ?? 'alloy') as string;
const maxTokens = process.env.AUDIO_LLM_MAX_TOKENS
  ? Number(process.env.AUDIO_LLM_MAX_TOKENS)
  : undefined;

const system =
  '你是一个擅长讲故事的中文语音助手。用户要求多长就尽量贴近该长度。' +
  '不要使用 Markdown 或列表，语气自然，适合直接朗读。';

function extractStreamAudioDelta(json: Record<string, unknown>):
  | { data?: string; transcript?: string }
  | undefined {
  const choice = (json.choices as Array<Record<string, unknown>> | undefined)?.[0];
  const delta = choice?.delta as { audio?: { data?: string; transcript?: string } } | undefined;
  if (delta?.audio) return delta.audio;
  const message = choice?.message as { audio?: { data?: string; transcript?: string } } | undefined;
  return message?.audio;
}

function base64ToBytes(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

function estimateSpeechSeconds(pcmBytes: number, sampleRate = 24_000): number {
  return pcmBytes / (sampleRate * 2);
}

async function tryWriteMp3(wavPath: string, mp3Path: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      ['ffmpeg', '-y', '-hide_banner', '-loglevel', 'error', '-i', wavPath, '-codec:a', 'libmp3lame', '-q:a', '4', mp3Path],
      { stdout: 'ignore', stderr: 'pipe' },
    );
    const code = await proc.exited;
    return code === 0;
  } catch {
    return false;
  }
}

const startedAt = performance.now();
const body: Record<string, unknown> = {
  model,
  messages: [
    { role: 'system', content: system },
    { role: 'user', content: query },
  ],
  modalities: ['text', 'audio'],
  audio: { voice, format: 'pcm16' },
  stream: true,
  stream_options: { include_usage: true },
  temperature: 0.7,
};
if (maxTokens !== undefined && Number.isFinite(maxTokens)) {
  body.max_tokens = maxTokens;
}

console.log('Query:', query);
console.log('Model:', model, '| voice:', voice, '| max_tokens:', maxTokens ?? '(unset)');
console.log('Requesting OpenRouter SSE…');

const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
  method: 'POST',
  headers: {
    authorization: `Bearer ${apiKey}`,
    'content-type': 'application/json',
    'x-title': 'OtterVoice Audio Story Test',
  },
  body: JSON.stringify(body),
});

if (!res.ok || !res.body) {
  throw new Error(`HTTP ${res.status}: ${await res.text()}`);
}

const audioB64Parts: string[] = [];
let transcript = '';
let finishReason: string | undefined;
let rawUsage: Record<string, unknown> | undefined;
let firstAudioAtMs: number | undefined;
let sseEventCount = 0;

for await (const data of parseSSEStream(res.body)) {
  if (data === '[DONE]') break;
  sseEventCount += 1;
  let json: Record<string, unknown>;
  try {
    json = JSON.parse(data) as Record<string, unknown>;
  } catch {
    continue;
  }
  const audio = extractStreamAudioDelta(json);
  if (audio?.data) {
    firstAudioAtMs ??= performance.now() - startedAt;
    audioB64Parts.push(audio.data);
  }
  if (audio?.transcript) transcript += audio.transcript;
  const choice = (json.choices as Array<Record<string, unknown>> | undefined)?.[0];
  if (choice?.finish_reason) finishReason = String(choice.finish_reason);
  if (json.usage) rawUsage = json.usage as Record<string, unknown>;
}

const pcm = base64ToBytes(audioB64Parts.join(''));
if (pcm.byteLength === 0) {
  throw new Error('No audio returned from SSE stream');
}
const wav = pcm16ToWav(pcm);
const totalMs = Math.round(performance.now() - startedAt);

const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = join(import.meta.dir, 'out', `audio-story-${stamp}`);
await mkdir(outDir, { recursive: true });

const transcriptPath = join(outDir, 'transcript.txt');
const wavPath = join(outDir, 'audio.wav');
const mp3Path = join(outDir, 'audio.mp3');
const metaPath = join(outDir, 'meta.json');

await Bun.write(transcriptPath, transcript);
await Bun.write(wavPath, wav);

const mp3Ok = await tryWriteMp3(wavPath, mp3Path);
const meta = {
  query,
  model,
  voice,
  maxTokens: maxTokens ?? null,
  transcriptChars: transcript.length,
  transcript,
  sseEventCount,
  audioChunkCount: audioB64Parts.length,
  pcmBytes: pcm.byteLength,
  wavBytes: wav.byteLength,
  estimatedSpeechSeconds: Number(estimateSpeechSeconds(pcm.byteLength).toFixed(2)),
  firstAudioAtMs: firstAudioAtMs !== undefined ? Math.round(firstAudioAtMs) : null,
  totalMs,
  finishReason: finishReason ?? null,
  completionTokens: rawUsage?.completion_tokens ?? null,
  promptTokens: rawUsage?.prompt_tokens ?? null,
  costUsd: rawUsage?.cost ?? null,
  generationId: res.headers.get('x-generation-id'),
  files: {
    transcript: transcriptPath,
    wav: wavPath,
    mp3: mp3Ok ? mp3Path : null,
  },
};

await Bun.write(metaPath, JSON.stringify(meta, null, 2));

console.log('\n--- Result ---');
console.log('Transcript chars:', meta.transcriptChars);
console.log('Completion tokens:', meta.completionTokens);
console.log('Audio chunks:', meta.audioChunkCount, '| PCM bytes:', meta.pcmBytes);
console.log('Est. speech duration:', meta.estimatedSpeechSeconds, 's');
console.log('Total wall time:', meta.totalMs, 'ms');
console.log('Finish reason:', meta.finishReason ?? '(none)');
console.log('\nSaved:');
console.log(' ', transcriptPath);
console.log(' ', wavPath);
if (mp3Ok) console.log(' ', mp3Path);
else console.log('  (ffmpeg not found — skipped audio.mp3; install ffmpeg or play audio.wav)');
console.log(' ', metaPath);
