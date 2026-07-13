import { describe, expect, it } from 'bun:test';
import { parseSSEStream, streamFromStrings } from '../src/sse';

async function collect(stream: ReadableStream<Uint8Array>): Promise<string[]> {
  const out: string[] = [];
  for await (const data of parseSSEStream(stream)) out.push(data);
  return out;
}

describe('parseSSEStream', () => {
  it('extracts data payloads and skips comments, blanks and other fields', async () => {
    const out = await collect(
      streamFromStrings([
        ': this is a comment\n',
        '\n',
        'event: message\n',
        'data: {"a":1}\n',
        'data: [DONE]\n',
      ]),
    );
    expect(out).toEqual(['{"a":1}', '[DONE]']);
  });

  it('reassembles a data line split across chunk boundaries', async () => {
    const out = await collect(streamFromStrings(['data: hel', 'lo world\n']));
    expect(out).toEqual(['hello world']);
  });

  it('handles an empty stream', async () => {
    expect(await collect(streamFromStrings([]))).toEqual([]);
  });

  it('yields a trailing data line that never received a final newline', async () => {
    const out = await collect(streamFromStrings(['data: {"a":1}']));
    expect(out).toEqual(['{"a":1}']);
  });
});
