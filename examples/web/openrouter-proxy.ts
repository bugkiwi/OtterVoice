const OPENROUTER_ORIGIN = 'https://openrouter.ai/api/v1';
const gatewayPrefix = '/api/voice';
const allowedUpstreamPaths = new Set([
  '/chat/completions',
  '/audio/transcriptions',
  '/audio/speech',
]);
const maxRequestBodyBytes = 6 * 1024 * 1024;
const allowedModelsByPath: Readonly<Record<string, ReadonlySet<string>>> = {
  '/chat/completions': new Set([
    'openai/gpt-audio-mini',
    'deepseek/deepseek-v4-flash:nitro',
  ]),
  '/audio/transcriptions': new Set(['qwen/qwen3-asr-flash-2026-02-10']),
  '/audio/speech': new Set(['hexgrad/kokoro-82m']),
};

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
  const upstreamPath = path.startsWith(`${gatewayPrefix}/`)
    ? path.slice(gatewayPrefix.length)
    : '';
  if (request.method !== 'POST' || !allowedUpstreamPaths.has(upstreamPath)) {
    return json({ error: 'not found' }, 404);
  }
  const origin = request.headers.get('origin');
  if (origin && origin !== url.origin) {
    return json({ error: 'origin rejected' }, 403);
  }
  if (!apiKey) {
    return json({ error: 'Voice gateway is not configured on the server' }, 503);
  }

  const requestBody = await request.arrayBuffer();
  if (requestBody.byteLength > maxRequestBodyBytes) {
    return json({ error: 'voice request is too large' }, 413);
  }
  let requestedModel: unknown;
  try {
    requestedModel = (
      JSON.parse(new TextDecoder().decode(requestBody)) as { model?: unknown }
    ).model;
  } catch {
    return json({ error: 'invalid JSON request' }, 400);
  }
  if (
    typeof requestedModel !== 'string' ||
    !allowedModelsByPath[upstreamPath]?.has(requestedModel)
  ) {
    return json({ error: 'model is not allowed for this route' }, 403);
  }
  const speechKey = path.endsWith('/audio/speech')
    ? new TextDecoder().decode(requestBody)
    : undefined;
  const cachedSpeech = speechKey ? speechCache.get(speechKey) : undefined;
  if (cachedSpeech) {
    return new Response(cachedSpeech.bytes.slice(0), {
      headers: {
        'cache-control': 'no-store',
        'content-type': cachedSpeech.contentType,
        'server-timing': 'voice_gateway;dur=0;desc="TTS memory cache"',
        'x-ottervoice-cache': 'HIT',
        ...(cachedSpeech.generationId ? { 'x-generation-id': cachedSpeech.generationId } : {}),
      },
    });
  }

  try {
    const startedAt = performance.now();
    const upstream = await fetch(`${OPENROUTER_ORIGIN}${upstreamPath}`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${apiKey}`,
        'content-type': request.headers.get('content-type') ?? 'application/json',
        'http-referer': `${url.protocol}//${url.host}`,
        'x-title': 'OtterVoice Web Example',
      },
      body: requestBody,
      signal: request.signal,
    });
    const headers = new Headers({
      'cache-control': 'no-store',
      'content-type': upstream.headers.get('content-type') ?? 'application/octet-stream',
      'server-timing': `voice_gateway;dur=${(performance.now() - startedAt).toFixed(1)}`,
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
    console.error(`[Voice gateway] ${upstreamPath}:`, error);
    return json({ error: error instanceof Error ? error.message : 'Upstream request failed' }, 502);
  }
}
