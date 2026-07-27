import { describe, expect, it } from 'bun:test';
import { SpeechTextSegmenter } from '../src/internal/speech-text-segmenter';

describe('SpeechTextSegmenter', () => {
  it('releases a Chinese sentence before the stream finishes', () => {
    const segmenter = new SpeechTextSegmenter();
    expect(segmenter.push('先说结论。后面的')).toEqual(['先说结论。']);
    expect(segmenter.push('解释还在生成')).toEqual([]);
    expect(segmenter.flush()).toEqual(['后面的解释还在生成']);
  });

  it('waits for enough text before splitting at a short comma', () => {
    const segmenter = new SpeechTextSegmenter();
    expect(segmenter.push('好的，')).toEqual([]);
    expect(segmenter.push('我马上帮你处理，')).toEqual(['好的，我马上帮你处理，']);
  });

  it('does not split a decimal at its full stop', () => {
    const segmenter = new SpeechTextSegmenter();
    expect(segmenter.push('The value is 3.14. ')).toEqual(['The value is 3.14.']);
  });

  it('forces a bounded first unit when punctuation is missing', () => {
    const segmenter = new SpeechTextSegmenter();
    const input = '这是一个没有任何标点而且会持续生成很长时间的中文回答需要提前开始语音合成避免等待全部文字完成';
    const segments = segmenter.push(input);
    expect(segments).toHaveLength(1);
    expect(Array.from(segments[0]!)).toHaveLength(28);
    expect(segmenter.flush().join('')).toBe(Array.from(input).slice(28).join(''));
  });
});
