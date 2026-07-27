const HARD_BOUNDARY = /[。！？!?；;\n]/u;
const SOFT_BOUNDARY = /[，,、：:]/u;
const CJK = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

function isEnglishFullStop(chars: readonly string[], index: number): boolean {
  if (chars[index] !== '.') return false;
  const previous = chars[index - 1];
  const next = chars[index + 1];
  if (previous !== undefined && next !== undefined && /\d/u.test(previous) && /\d/u.test(next)) {
    return false;
  }
  return next === undefined || /\s/u.test(next);
}

function boundaryIndex(chars: readonly string[], minimumSoftLength: number): number | undefined {
  for (let index = 0; index < chars.length; index += 1) {
    const char = chars[index]!;
    if (HARD_BOUNDARY.test(char) || isEnglishFullStop(chars, index)) return index + 1;
    if (index + 1 >= minimumSoftLength && SOFT_BOUNDARY.test(char)) return index + 1;
  }
  return undefined;
}

function forcedBoundaryIndex(chars: readonly string[], maximumLength: number): number | undefined {
  if (chars.length < maximumLength) return undefined;
  const minimum = Math.floor(maximumLength * 0.55);
  for (let index = maximumLength - 1; index >= minimum; index -= 1) {
    if (SOFT_BOUNDARY.test(chars[index]!) || /\s/u.test(chars[index]!)) return index + 1;
  }
  return maximumLength;
}

/**
 * Incrementally split an LLM text stream into natural, bounded speech units.
 * Use it to start TTS at the first complete clause while keeping enough text
 * per request for stable prosody.
 */
export class SpeechTextSegmenter {
  private pending = '';
  private emitted = 0;

  /**
   * Add newly generated text and return every complete speech unit now ready.
   *
   * @param delta - The next append-only LLM text fragment.
   * @returns Zero or more sentence/clause-sized strings in source order.
   */
  push(delta: string): string[] {
    this.pending += delta;
    return this.take(false);
  }

  /**
   * Emit the remaining text after the LLM stream completes.
   *
   * @returns The last speech unit, or an empty array when nothing remains.
   */
  flush(): string[] {
    return this.take(true);
  }

  private take(final: boolean): string[] {
    const segments: string[] = [];
    while (this.pending.length > 0) {
      const chars = Array.from(this.pending);
      const cjk = CJK.test(this.pending);
      const minimumSoftLength = cjk ? 8 : 24;
      const maximumLength = cjk
        ? this.emitted === 0 ? 28 : 42
        : this.emitted === 0 ? 72 : 100;
      const end = boundaryIndex(chars, minimumSoftLength) ??
        forcedBoundaryIndex(chars, maximumLength);
      if (end === undefined) {
        if (!final) break;
        const remainder = this.pending.trim();
        this.pending = '';
        if (remainder.length > 0) {
          segments.push(remainder);
          this.emitted += 1;
        }
        break;
      }
      const segment = chars.slice(0, end).join('').trim();
      this.pending = chars.slice(end).join('').trimStart();
      if (segment.length > 0) {
        segments.push(segment);
        this.emitted += 1;
      }
    }
    return segments;
  }
}
