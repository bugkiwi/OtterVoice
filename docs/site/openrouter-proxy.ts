const OPENROUTER_ORIGIN = 'https://openrouter.ai/api/v1';
declare const process: {
  readonly env: { readonly OPENROUTER_API_KEY?: string };
};

const allowedRoutes = new Set([
  '/api/openrouter/chat/completions',
  '/api/openrouter/audio/transcriptions',
  '/api/openrouter/audio/speech',
]);

interface CachedSpeech {
  bytes: ArrayBuffer;
  contentType: string;
  generationId?: string;
}

const speechCache = new Map<string, CachedSpeech>();

function json(body: unknown, status: number): Response {
  return Response.json(body, { status, headers: { 'cache-control': 'no-store' } });
}

export async function proxyOpenRouter(
  request: Request,
  apiKey = process.env.OPENROUTER_API_KEY,
): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;
  if (request.method !== 'POST' || !allowedRoutes.has(path)) {
    return json({ error: 'not found' }, 404);
  }
  if (!apiKey) {
    return json({ error: 'OPENROUTER_API_KEY is not configured on the server' }, 503);
  }

  const requestBody = await request.arrayBuffer();
  const speechKey = path.endsWith('/audio/speech')
    ? new TextDecoder().decode(requestBody)
    : undefined;
  const cachedSpeech = speechKey ? speechCache.get(speechKey) : undefined;
  if (cachedSpeech) {
    return new Response(cachedSpeech.bytes.slice(0), {
      headers: {
        'cache-control': 'no-store',
        'content-type': cachedSpeech.contentType,
        'server-timing': 'openrouter;dur=0;desc="TTS memory cache"',
        'x-ottervoice-cache': 'HIT',
        ...(cachedSpeech.generationId ? { 'x-generation-id': cachedSpeech.generationId } : {}),
      },
    });
  }

  const upstreamPath = path.slice('/api/openrouter'.length);
  try {
    const startedAt = performance.now();
    const upstream = await fetch(`${OPENROUTER_ORIGIN}${upstreamPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': request.headers.get('content-type') ?? 'application/json',
        'http-referer': `${url.protocol}//${url.host}`,
        'x-title': 'OtterVoice Docs',
      },
      body: requestBody,
      signal: request.signal,
    });
    const headers = new Headers({
      'cache-control': 'no-store',
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'server-timing': `openrouter;dur=${(performance.now() - startedAt).toFixed(1)}`,
    });
    const generationId = upstream.headers.get('x-generation-id');
    if (generationId) headers.set('x-generation-id', generationId);

    if (speechKey && upstream.ok) {
      const cached: CachedSpeech = {
        bytes: await upstream.arrayBuffer(),
        contentType: headers.get('content-type') ?? 'audio/mpeg',
        ...(generationId ? { generationId } : {}),
      };
      if (speechCache.size >= 32) {
        const oldestKey = speechCache.keys().next().value;
        if (oldestKey !== undefined) speechCache.delete(oldestKey);
      }
      speechCache.set(speechKey, cached);
      headers.set('x-ottervoice-cache', 'MISS');
      return new Response(cached.bytes.slice(0), {
        status: upstream.status,
        statusText: upstream.statusText,
        headers,
      });
    }
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers,
    });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    console.error(`[OpenRouter proxy] ${upstreamPath}:`, error);
    return json({ error: error instanceof Error ? error.message : 'OpenRouter request failed' }, 502);
  }
}
