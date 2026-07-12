/**
 * Default monotonic-ish id generator. Avoids a crypto dependency so the core
 * stays runtime-agnostic; sessions may inject their own via config.
 */
export function createIdGenerator(prefix = 'id'): () => string {
  let counter = 0;
  return () => {
    counter += 1;
    const random = Math.random().toString(36).slice(2, 8);
    return `${prefix}_${counter.toString(36)}${random}`;
  };
}

export const defaultNow = (): number => Date.now();
