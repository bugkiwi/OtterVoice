import { describe, expect, it } from 'bun:test';
import { streamFromStrings } from '@ottervoice/provider-utils';
import { createOpenRouterAudioLLM, pcm16ToWav } from '../src/audio-llm';

describe('createOpenRouterAudioLLM', () => {
  it('sends audio input and assembles streamed PCM plus transcript', async () => {
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
            'data: {"choices":[{"delta":{"audio":{"data":"AQI=","transcript":"你"}}}]}\n',
            'data: {"choices":[{"delta":{"audio":{"data":"AwQ=","transcript":"好"}}}],"usage":{"prompt_tokens":9,"completion_tokens":4}}\n',
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
    expect(new Uint8Array(output.audioBuffer).slice(44)).toEqual(new Uint8Array([1, 2, 3, 4]));
    expect(output.usage).toMatchObject({ inputTokens: 9, outputTokens: 4 });
  });

  it('writes a valid WAV header around PCM16', () => {
    const wav = pcm16ToWav(new Uint8Array([1, 2, 3, 4]));
    expect(new TextDecoder().decode(wav.slice(0, 4))).toBe('RIFF');
    expect(new TextDecoder().decode(wav.slice(8, 12))).toBe('WAVE');
    expect(new DataView(wav).getUint32(24, true)).toBe(24_000);
  });
});
