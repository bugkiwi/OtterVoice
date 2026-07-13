import { describe, expect, it } from 'bun:test';
import { streamFromStrings } from '@ottervoice/provider-utils';
import { createOpenRouterAudioLLM, pcm16ToWav } from '../src/audio-llm';

function bytesToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64');
}

describe('createOpenRouterAudioLLM', () => {
  it('joins streamed base64 fragments before decoding (OpenRouter wav contract)', async () => {
    // Continuous base64 of a tiny payload, split mid-stream the way OpenRouter
    // does — individual fragments are not independently valid base64.
    const fullAudio = new Uint8Array([0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 5, 6]);
    const fullB64 = bytesToBase64(fullAudio);
    const mid = 5;
    const part1 = fullB64.slice(0, mid);
    const part2 = fullB64.slice(mid);
    const streamedAudio: number[] = [];

    let body: any;
    const provider = createOpenRouterAudioLLM({
      apiKey: 'test',
      model: 'openai/gpt-audio-mini',
      prepareAudio: async () => ({
        audio: new Uint8Array([1, 2, 3]).buffer,
        format: 'wav',
      }),
      fetch: async (_url, init) => {
        body = JSON.parse(String(init?.body));
        return new Response(
          streamFromStrings([
            `data: {"choices":[{"delta":{"audio":{"data":${JSON.stringify(part1)},"transcript":"你"}}}]}\n`,
            `data: {"choices":[{"delta":{"audio":{"data":${JSON.stringify(part2)},"transcript":"好"}}}],"usage":{"prompt_tokens":9,"completion_tokens":4}}\n`,
            'data: [DONE]\n',
          ]),
          { status: 200, headers: { 'content-type': 'text/event-stream' } },
        );
      },
    });

    const output = await provider.generate({
      audio: new Uint8Array([9]).buffer,
      format: 'webm',
      messages: [{ role: 'assistant', content: '早上好' }],
      onAudioChunk(chunk) {
        expect(chunk).toMatchObject({
          encoding: 'pcm_s16le',
          sampleRate: 24_000,
          channels: 1,
        });
        streamedAudio.push(...new Uint8Array(chunk.data));
      },
    });

    expect(body.model).toBe('openai/gpt-audio-mini');
    expect(body.modalities).toEqual(['text', 'audio']);
    expect(body.audio).toEqual({ voice: 'alloy', format: 'pcm16' });
    expect(body.messages.at(-1).content[1]).toEqual({
      type: 'input_audio',
      input_audio: { data: 'AQID', format: 'wav' },
    });
    expect(output.text).toBe('你好');
    expect(output.mimeType).toBe('audio/wav');
    expect(new TextDecoder().decode(output.audioBuffer.slice(0, 4))).toBe('RIFF');
    expect(new Uint8Array(output.audioBuffer).slice(44)).toEqual(fullAudio);
    expect(streamedAudio).toEqual([...fullAudio]);
    expect(output.usage).toMatchObject({ inputTokens: 9, outputTokens: 4 });
  });

  it('also reads audio from the final message payload', async () => {
    const fullAudio = new Uint8Array([9, 8, 7, 6]);
    const fullB64 = bytesToBase64(fullAudio);
    const provider = createOpenRouterAudioLLM({
      apiKey: 'test',
      model: 'openai/gpt-audio-mini',
      fetch: async () =>
        new Response(
          streamFromStrings([
            `data: {"choices":[{"delta":{"audio":{"data":${JSON.stringify(fullB64.slice(0, 4))}}}}]}\n`,
            `data: {"choices":[{"message":{"audio":{"data":${JSON.stringify(fullB64.slice(4))},"transcript":"hi"}}}]}\n`,
            'data: [DONE]\n',
          ]),
          { status: 200 },
        ),
    });

    const output = await provider.generate({
      audio: new Uint8Array([1]).buffer,
      format: 'wav',
      messages: [],
    });
    expect(output.text).toBe('hi');
    expect(new TextDecoder().decode(output.audioBuffer.slice(0, 4))).toBe('RIFF');
    expect(new Uint8Array(output.audioBuffer).slice(44)).toEqual(fullAudio);
  });

  it('writes a valid WAV header around PCM16', () => {
    const wav = pcm16ToWav(new Uint8Array([1, 2, 3, 4]));
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
    expect(new DataView(wav).getUint32(24, true)).toBe(24_000);
  });
});
