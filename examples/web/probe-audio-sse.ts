/**
 * Probe OpenRouter gpt-audio-mini SSE: compare max_tokens impact.
 *
 *   cd examples/web && bun run probe-audio-sse.ts [audio.mp3]
 */
import { parseSSEStream } from '../../packages/provider-utils/src/sse';

const apiKey = process.env.OPENROUTER_API_KEY;
if (!apiKey) throw new Error('OPENROUTER_API_KEY is required');

function makeSilentWav(seconds = 0.5, sampleRate = 24_000): ArrayBuffer {
  const samples = Math.floor(sampleRate * seconds);
  const pcm = new Uint8Array(samples * 2);
  const wav = new ArrayBuffer(44 + pcm.byteLength);
  const view = new DataView(wav);
  const write = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) view.setUint8(offset + i, value.charCodeAt(i));
  };
  write(0, 'RIFF');
  view.setUint32(4, 36 + pcm.byteLength, true);
  write(8, 'WAVE');
  write(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  write(36, 'data');
  view.setUint32(40, pcm.byteLength, true);
  new Uint8Array(wav, 44).set(pcm);
  return wav;
}

const inputPath = process.argv[2];
const input = inputPath
  ? await Bun.file(inputPath).arrayBuffer()
  : makeSilentWav();
const b64 = Buffer.from(input).toString('base64');

const system =
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复。' +
  '每次只回复 1–2 个简短句子，不使用 Markdown，不列表，适合直接语音播放。';

async function probe(maxTokens: number | undefined) {
  const body: Record<string, unknown> = {
    model: 'openai/gpt-audio-mini',
    messages: [
      { role: 'system', content: system },
      {
        role: 'user',
        content: [
          { type: 'text', text: 'Respond naturally to this voice message.' },
          { type: 'input_audio', input_audio: { data: b64, format: inputPath ? 'mp3' : 'wav' } },
        ],
      },
    ],
    modalities: ['text', 'audio'],
    audio: { voice: 'alloy', format: 'pcm16' },
    stream: true,
    stream_options: { include_usage: true },
    temperature: 0.45,
  };
  if (maxTokens !== undefined) body.max_tokens = maxTokens;

  const startedAt = performance.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      authorization: `Bearer ${apiKey}`,
      'content-type': 'application/json',
      'x-title': 'OtterVoice SSE Probe',
    },
    body: JSON.stringify(body),
  });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  }

  const audioB64Parts: string[] = [];
  let transcript = '';
  let finishReason: string | undefined;
  let usage: Record<string, unknown> | undefined;
  let chunkCount = 0;
  let sawDone = false;

  for await (const data of parseSSEStream(res.body)) {
    if (data === '[DONE]') {
      sawDone = true;
      break;
    }
    chunkCount += 1;
    let json: Record<string, unknown>;
    try {
      json = JSON.parse(data) as Record<string, unknown>;
    } catch {
      continue;
    }
    const choice = (json.choices as Array<Record<string, unknown>> | undefined)?.[0];
    const delta = choice?.delta as { audio?: { data?: string; transcript?: string } } | undefined;
    if (delta?.audio?.data) audioB64Parts.push(delta.audio.data);
    if (delta?.audio?.transcript) transcript += delta.audio.transcript;
    if (choice?.finish_reason) finishReason = String(choice.finish_reason);
    if (json.usage) usage = json.usage as Record<string, unknown>;
  }

  const audioBytes = audioB64Parts.join('').length
    ? Buffer.from(audioB64Parts.join(''), 'base64').byteLength
    : 0;

  return {
    maxTokens: maxTokens ?? '(unset)',
    elapsedMs: Math.round(performance.now() - startedAt),
    sseChunks: chunkCount,
    audioB64Parts: audioB64Parts.length,
    audioBytes,
    transcriptChars: transcript.length,
    transcript,
    finishReason: finishReason ?? '(none)',
    sawDone,
    completionTokens: usage?.completion_tokens,
    truncated: usage?.completion_tokens === maxTokens,
    cost: usage?.cost,
  };
}

for (const maxTokens of [80, 256, 1024, undefined] as const) {
  const result = await probe(maxTokens);
  console.log(JSON.stringify(result, null, 2));
  console.log('---');
}
