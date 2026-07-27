import { describe, expect, it } from 'bun:test';
import { createOpenRouterGatewayVoiceTurn } from '../src/voice-turn';

describe('createOpenRouterGatewayVoiceTurn', () => {
  it('sends one audio turn and emits input text, text deltas, and MP3 segments', async () => {
    let requestBody: Record<string, unknown> | undefined;
    const inputTexts: string[] = [];
    const deltas: string[] = [];
    const segments: Array<{ sequence: number; bytes: number[]; mimeType: string }> = [];
    const provider = createOpenRouterGatewayVoiceTurn({
      baseUrl: 'https://app.test/api/voice/asr-llm-tts',
      requireDoneSentinel: true,
      fetch: async (_input, init) => {
        requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
        return new Response([
          'data: {"type":"input_text","text":"你好"}',
          '',
          'data: {"type":"output_text_delta","delta":"第一句。"}',
          '',
          'data: {"type":"output_audio_segment","sequence":0,"mimeType":"audio/mpeg","data":"AQI="}',
          '',
          'data: {"type":"output_text_delta","delta":"第二句。"}',
          '',
          'data: {"type":"output_audio_segment","sequence":1,"mimeType":"audio/mpeg","data":"AwQ="}',
          '',
          'data: {"type":"usage","usage":{"inputTokens":3,"outputTokens":4,"totalTokens":7}}',
          '',
          'data: {"type":"done"}',
          '',
          'data: [DONE]',
          '',
        ].join('\n'), { headers: { 'content-type': 'text/event-stream' } });
      },
    });

    const output = await provider.generate({
      audio: new Uint8Array([9, 8]).buffer,
      format: 'wav',
      messages: [{ role: 'assistant', content: 'history' }],
      onInputTranscript: (text) => inputTexts.push(text),
      onTranscriptDelta: (text) => deltas.push(text),
      onAudioSegment: (segment) => {
        segments.push({
          sequence: segment.sequence,
          bytes: [...new Uint8Array(segment.data)],
          mimeType: segment.mimeType,
        });
      },
    });

    expect(provider.transcribesInput).toBe(true);
    expect(requestBody).toEqual({
      messages: [
        { role: 'assistant', content: 'history' },
        {
          role: 'user',
          content: [{
            type: 'input_audio',
            input_audio: { data: 'CQg=', format: 'wav' },
          }],
        },
      ],
    });
    expect(inputTexts).toEqual(['你好']);
    expect(deltas).toEqual(['第一句。', '第二句。']);
    expect(segments).toEqual([
      { sequence: 0, bytes: [1, 2], mimeType: 'audio/mpeg' },
      { sequence: 1, bytes: [3, 4], mimeType: 'audio/mpeg' },
    ]);
    expect(output).toMatchObject({
      inputText: '你好',
      text: '第一句。第二句。',
      mimeType: 'audio/mpeg',
      usage: { inputTokens: 3, outputTokens: 4, totalTokens: 7 },
    });
    expect([...new Uint8Array(output.audioBuffer)]).toEqual([1, 2, 3, 4]);
  });

  it('surfaces a sanitized composite SSE error', async () => {
    const provider = createOpenRouterGatewayVoiceTurn({
      baseUrl: 'https://app.test/api/voice/asr-llm-tts',
      fetch: async () => new Response([
        'data: {"type":"error","error":{"code":"tts_failed","message":"TTS stage failed","stage":"gateway","retryable":true}}',
        '',
        'data: [DONE]',
        '',
      ].join('\n')),
    });

    await expect(provider.generate({
      audio: new Uint8Array([1]).buffer,
      format: 'wav',
      messages: [],
    })).rejects.toMatchObject({
      code: 'tts_failed',
      message: 'TTS stage failed',
    });
  });
});
