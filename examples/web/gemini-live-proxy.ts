import { HttpsProxyAgent } from 'https-proxy-agent';
import WebSocket, { type RawData } from 'ws';
import { DEMO_VOICE_PROFILE } from './voice-profile';

export const GEMINI_LIVE_MODEL = DEMO_VOICE_PROFILE.models.geminiLive;
export const GEMINI_LIVE_VOICE = DEMO_VOICE_PROFILE.voices.geminiLive;

const DEFAULT_SYSTEM_PROMPT =
  `当前日期是 ${new Date().toISOString().slice(0, 10)}。` +
  '你是一个反应快、语气自然的语音对话助手。默认用中文回复；如果用户明显使用其他语言，则跟随用户。' +
  '第一句立即给出结论；每次只回复 1–5 个简短句子，不使用 Markdown，不列表，适合直接语音播放。' +
  '如果会话启用了 Google Search Grounding，对时效性信息必须先搜索核实。';
const OFFLINE_ROUTE = `${DEMO_VOICE_PROFILE.routes.geminiLive}/chat/completions`;
const ONLINE_ROUTE = `${DEMO_VOICE_PROFILE.routes.geminiLiveOnline}/chat/completions`;
const MAX_REQUEST_BYTES = 6 * 1024 * 1024;
const MAX_MESSAGES = 24;
const MAX_TEXT_CHARACTERS = 20_000;
const PCM_CHUNK_BYTES = 16_000;
const TURN_TIMEOUT_MS = 60_000;

type TextMessage = { role: 'user' | 'assistant'; content: string };
type GeminiLiveServerMessage = {
  setupComplete?: Record<string, unknown>;
  serverContent?: {
    modelTurn?: { parts?: Array<{ inlineData?: { data?: string; mimeType?: string } }> };
    outputTranscription?: { text?: string };
    turnComplete?: boolean;
  };
  usageMetadata?: {
    promptTokenCount?: number;
    responseTokenCount?: number;
    totalTokenCount?: number;
  };
  error?: { message?: string };
};
type GeminiRealtimeInput = {
  audio?: { data: string; mimeType: string };
  audioStreamEnd?: boolean;
};
type GeminiLiveCallbacks = {
  onmessage: (message: GeminiLiveServerMessage) => void;
  onerror?: (error: Error) => void;
  onclose?: (event: { code: number; reason: string }) => void;
};
type GeminiLiveSession = {
  sendRealtimeInput: (input: GeminiRealtimeInput) => void;
  close: () => void;
};
type GeminiLiveClient = {
  connect: (options: {
    systemInstruction: string;
    searchEnabled: boolean;
    voiceName: string;
    callbacks: GeminiLiveCallbacks;
  }) => Promise<GeminiLiveSession>;
};

export interface GeminiLiveGatewayOptions {
  apiKey?: string;
  systemPrompt?: string;
  proxyUrl?: string;
  createClient?: (apiKey: string) => GeminiLiveClient;
}

class ClientRequestError extends Error {}

class ContinuousBase64Encoder {
  private carry = Buffer.alloc(0);

  push(value: string): string {
    const bytes = Buffer.from(value, 'base64');
    const combined = this.carry.byteLength > 0
      ? Buffer.concat([this.carry, bytes])
      : bytes;
    const completeBytes = combined.byteLength - (combined.byteLength % 3);
    this.carry = Buffer.from(combined.subarray(completeBytes));
    return completeBytes > 0
      ? combined.subarray(0, completeBytes).toString('base64')
      : '';
  }

  finish(): string {
    const encoded = this.carry.toString('base64');
    this.carry = Buffer.alloc(0);
    return encoded;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { 'cache-control': 'no-store' },
  });
}

function decodeBase64(value: string): Uint8Array {
  if (value.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(value)) {
    throw new ClientRequestError('invalid input audio');
  }
  const bytes = Buffer.from(value, 'base64');
  if (bytes.byteLength === 0) throw new ClientRequestError('invalid input audio');
  return new Uint8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
}

function fourCc(bytes: Uint8Array, offset: number): string {
  return String.fromCharCode(
    bytes[offset] ?? 0,
    bytes[offset + 1] ?? 0,
    bytes[offset + 2] ?? 0,
    bytes[offset + 3] ?? 0,
  );
}

function readPcm16Wav(bytes: Uint8Array): Uint8Array {
  if (
    bytes.byteLength < 44 ||
    fourCc(bytes, 0) !== 'RIFF' ||
    fourCc(bytes, 8) !== 'WAVE'
  ) {
    throw new ClientRequestError('Gemini Live input must be a PCM16 WAV');
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let format: { audioFormat: number; channels: number; sampleRate: number; bits: number } | undefined;
  let pcm: Uint8Array | undefined;
  let offset = 12;
  while (offset + 8 <= bytes.byteLength) {
    const id = fourCc(bytes, offset);
    const size = view.getUint32(offset + 4, true);
    const dataOffset = offset + 8;
    if (dataOffset + size > bytes.byteLength) {
      throw new ClientRequestError('invalid WAV chunk length');
    }
    if (id === 'fmt ' && size >= 16) {
      format = {
        audioFormat: view.getUint16(dataOffset, true),
        channels: view.getUint16(dataOffset + 2, true),
        sampleRate: view.getUint32(dataOffset + 4, true),
        bits: view.getUint16(dataOffset + 14, true),
      };
    } else if (id === 'data') {
      pcm = bytes.slice(dataOffset, dataOffset + size);
    }
    offset = dataOffset + size + (size % 2);
  }

  if (
    !format ||
    format.audioFormat !== 1 ||
    format.channels !== 1 ||
    format.sampleRate !== 16_000 ||
    format.bits !== 16 ||
    !pcm ||
    pcm.byteLength === 0 ||
    pcm.byteLength % 2 !== 0
  ) {
    throw new ClientRequestError('Gemini Live requires mono 16 kHz PCM16 WAV input');
  }
  return pcm;
}

function readAudioTurn(body: Record<string, unknown>): {
  history: TextMessage[];
  pcm: Uint8Array;
} {
  if (
    !Array.isArray(body.messages) ||
    body.messages.length === 0 ||
    body.messages.length > MAX_MESSAGES
  ) {
    throw new ClientRequestError('invalid audio conversation history');
  }

  const history: TextMessage[] = [];
  let inputAudio: { data: string; format: string } | undefined;
  let textCharacters = 0;
  for (const [index, value] of body.messages.entries()) {
    if (!isRecord(value) || (value.role !== 'user' && value.role !== 'assistant')) {
      throw new ClientRequestError('client message role is not allowed');
    }
    if (typeof value.content === 'string') {
      textCharacters += value.content.length;
      if (textCharacters > MAX_TEXT_CHARACTERS) {
        throw new ClientRequestError('conversation text is too large');
      }
      history.push({ role: value.role, content: value.content });
      continue;
    }
    if (
      index !== body.messages.length - 1 ||
      value.role !== 'user' ||
      !Array.isArray(value.content)
    ) {
      throw new ClientRequestError('multimodal audio must be the final user message');
    }
    for (const item of value.content) {
      if (!isRecord(item)) throw new ClientRequestError('invalid audio content item');
      if (item.type === 'text') continue;
      if (item.type !== 'input_audio' || !isRecord(item.input_audio)) {
        throw new ClientRequestError('audio content item is not allowed');
      }
      const data = item.input_audio.data;
      const format = item.input_audio.format;
      if (inputAudio || typeof data !== 'string' || typeof format !== 'string') {
        throw new ClientRequestError('invalid input audio');
      }
      inputAudio = { data, format };
    }
  }
  if (!inputAudio || inputAudio.format !== 'wav') {
    throw new ClientRequestError('Gemini Live input must be WAV');
  }
  return { history, pcm: readPcm16Wav(decodeBase64(inputAudio.data)) };
}

function historySystemPrompt(systemPrompt: string, history: TextMessage[]): string {
  if (history.length === 0) return systemPrompt;
  const transcript = history.map((message) => {
    const role = message.role === 'user' ? '用户' : '助手';
    return `${role}：${message.content}`;
  }).join('\n');
  return `${systemPrompt}\n以下是此前已完成的对话，仅作为当前语音问题的上下文：\n${transcript}`;
}

function normalizeWebSocketError(value: unknown): Error {
  if (value instanceof Error) return value;
  if (isRecord(value) && typeof value.message === 'string' && value.message) {
    return new Error(value.message);
  }
  return new Error('Gemini Live WebSocket failed');
}

function createDirectGeminiLiveClient(apiKey: string, proxyUrl?: string): GeminiLiveClient {
  return {
    connect(options) {
      return new Promise<GeminiLiveSession>((resolve, reject) => {
        const url =
          'wss://generativelanguage.googleapis.com/ws/' +
          'google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent' +
          `?key=${encodeURIComponent(apiKey)}`;
        const socket = new WebSocket(url, {
          ...(proxyUrl ? { agent: new HttpsProxyAgent(proxyUrl) } : {}),
        });
        let connected = false;
        const timeout = setTimeout(() => {
          socket.terminate();
          reject(new Error('Gemini Live WebSocket setup timed out'));
        }, 20_000);
        const session: GeminiLiveSession = {
          sendRealtimeInput(input) {
            socket.send(JSON.stringify({ realtimeInput: input }));
          },
          close() {
            if (socket.readyState === WebSocket.OPEN) socket.close();
          },
        };

        socket.once('open', () => {
          socket.send(JSON.stringify({
            setup: {
              model: `models/${GEMINI_LIVE_MODEL}`,
              generationConfig: {
                responseModalities: ['AUDIO'],
                speechConfig: {
                  voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: options.voiceName },
                  },
                },
                thinkingConfig: { thinkingLevel: 'MINIMAL' },
              },
              systemInstruction: {
                parts: [{ text: options.systemInstruction }],
              },
              outputAudioTranscription: {},
              ...(options.searchEnabled ? { tools: [{ googleSearch: {} }] } : {}),
            },
          }));
        });
        socket.on('message', (data: RawData) => {
          let message: GeminiLiveServerMessage;
          try {
            message = JSON.parse(data.toString()) as GeminiLiveServerMessage;
          } catch {
            return;
          }
          if (message.error?.message) {
            options.callbacks.onerror?.(new Error(message.error.message));
            return;
          }
          if (message.setupComplete && !connected) {
            connected = true;
            clearTimeout(timeout);
            resolve(session);
          }
          options.callbacks.onmessage(message);
        });
        // Keep this listener for the socket's full lifetime. Bun/ws can emit a
        // second ErrorEvent while a failed proxy handshake or terminate() is
        // unwinding; a once-listener would leave that event unhandled and kill
        // the demo process.
        socket.on('error', (value: unknown) => {
          const error = normalizeWebSocketError(value);
          options.callbacks.onerror?.(error);
          if (!connected) {
            clearTimeout(timeout);
            reject(error);
          }
        });
        socket.once('close', (code, reason) => {
          const event = { code, reason: reason.toString() };
          options.callbacks.onclose?.(event);
          if (!connected) {
            clearTimeout(timeout);
            reject(new Error(event.reason || `Gemini Live WebSocket closed (${code})`));
          }
        });
      });
    },
  };
}

async function createGeminiStream(
  request: Request,
  client: GeminiLiveClient,
  history: TextMessage[],
  pcm: Uint8Array,
  systemPrompt: string,
  searchEnabled: boolean,
): Promise<Response> {
  const encoder = new TextEncoder();
  let activeSession: GeminiLiveSession | undefined;
  let rejectTurn: ((reason: Error) => void) | undefined;
  let sessionReady = false;
  let streamSettled = false;
  let resolveConnected: (() => void) | undefined;
  let rejectConnected: ((reason: Error) => void) | undefined;
  const closeActiveSession = () => {
    const session = activeSession;
    activeSession = undefined;
    session?.close();
  };
  const connected = new Promise<void>((resolve, reject) => {
    resolveConnected = resolve;
    rejectConnected = reject;
  });
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const enqueue = (value: Uint8Array): boolean => {
        if (streamSettled || request.signal.aborted) return false;
        try {
          controller.enqueue(value);
          return true;
        } catch {
          streamSettled = true;
          return false;
        }
      };
      const write = (payload: unknown) => {
        enqueue(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
      };
      const closeStream = () => {
        if (streamSettled) return;
        streamSettled = true;
        try {
          controller.close();
        } catch {
          // A browser-side cancellation may have already closed the stream.
        }
      };
      const errorStream = (error: unknown) => {
        if (streamSettled) return;
        streamSettled = true;
        try {
          controller.error(error);
        } catch {
          // A browser-side cancellation may have already closed the stream.
        }
      };
      const run = async () => {
        let turnComplete = false;
        const audioEncoder = new ContinuousBase64Encoder();
        let resolveTurn: (() => void) | undefined;
        const turnDone = new Promise<void>((resolve, reject) => {
          resolveTurn = resolve;
          rejectTurn = reject;
        });
        // Abort may arrive while the upstream handshake is still pending.
        // Mark this promise handled immediately so that early cancellation is
        // never reported by Bun as an unhandled rejection.
        void turnDone.catch(() => undefined);
        const callbacks: GeminiLiveCallbacks = {
          onmessage(message) {
            const content = message.serverContent;
            const transcript = content?.outputTranscription?.text;
            if (transcript) {
              write({ choices: [{ delta: { audio: { transcript } } }] });
            }
            for (const part of content?.modelTurn?.parts ?? []) {
              if (part.inlineData?.data) {
                const audio = audioEncoder.push(part.inlineData.data);
                if (audio) write({ choices: [{ delta: { audio: { data: audio } } }] });
              }
            }
            if (message.usageMetadata) {
              write({
                usage: {
                  prompt_tokens: message.usageMetadata.promptTokenCount,
                  completion_tokens: message.usageMetadata.responseTokenCount,
                  total_tokens: message.usageMetadata.totalTokenCount,
                },
              });
            }
            if (content?.turnComplete && !turnComplete) {
              const finalAudio = audioEncoder.finish();
              if (finalAudio) {
                write({ choices: [{ delta: { audio: { data: finalAudio } } }] });
              }
              turnComplete = true;
              resolveTurn?.();
            }
          },
          onerror(event) {
            if (sessionReady) {
              rejectTurn?.(new Error(event.message || 'Gemini Live WebSocket failed'));
            }
          },
          onclose(event) {
            if (sessionReady && !turnComplete) {
              rejectTurn?.(new Error(event.reason || 'Gemini Live WebSocket closed early'));
            }
          },
        };

        activeSession = await client.connect({
          callbacks,
          systemInstruction: historySystemPrompt(systemPrompt, history),
          searchEnabled,
          voiceName: GEMINI_LIVE_VOICE,
        });
        sessionReady = true;
        if (request.signal.aborted) throw new Error('client request was aborted');
        resolveConnected?.();

        for (let offset = 0; offset < pcm.byteLength; offset += PCM_CHUNK_BYTES) {
          const chunk = pcm.subarray(offset, Math.min(pcm.byteLength, offset + PCM_CHUNK_BYTES));
          activeSession.sendRealtimeInput({
            audio: {
              data: Buffer.from(chunk).toString('base64'),
              mimeType: 'audio/pcm;rate=16000',
            },
          });
        }
        activeSession.sendRealtimeInput({ audioStreamEnd: true });

        const timeout = setTimeout(() => {
          rejectTurn?.(new Error('Gemini Live turn timed out'));
        }, TURN_TIMEOUT_MS);
        try {
          await turnDone;
        } finally {
          clearTimeout(timeout);
        }
        enqueue(encoder.encode('data: [DONE]\n\n'));
        closeStream();
      };

      request.signal.addEventListener('abort', () => {
        if (sessionReady) {
          rejectTurn?.(new Error('client request was aborted'));
        }
        closeActiveSession();
      }, { once: true });

      void run().catch((error) => {
        rejectConnected?.(error);
        if (request.signal.aborted) closeStream();
        else errorStream(error);
      }).finally(() => {
        sessionReady = false;
        closeActiveSession();
      });
    },
    cancel() {
      streamSettled = true;
      if (sessionReady) {
        rejectTurn?.(new Error('response stream was cancelled'));
      }
      closeActiveSession();
    },
  });

  const response = new Response(stream, {
    headers: {
      'cache-control': 'no-store',
      'content-type': 'text/event-stream; charset=utf-8',
      'x-accel-buffering': 'no',
    },
  });
  // Do not commit an HTTP 200 response until the upstream Live setup succeeds.
  // This turns quota/auth/setup failures into a regular gateway error instead
  // of resetting the browser's SSE connection before its first event.
  await connected;
  return response;
}

export function createGeminiLiveGateway(
  options: GeminiLiveGatewayOptions,
): (request: Request) => Promise<Response> {
  const client = options.apiKey
    ? options.createClient?.(options.apiKey) ?? createDirectGeminiLiveClient(
        options.apiKey,
        options.proxyUrl ?? process.env.HTTPS_PROXY ?? process.env.HTTP_PROXY,
      )
    : undefined;
  const systemPrompt = options.systemPrompt ?? DEFAULT_SYSTEM_PROMPT;

  return async (request: Request): Promise<Response> => {
    const url = new URL(request.url);
    const searchEnabled = url.pathname === ONLINE_ROUTE;
    if (!searchEnabled && url.pathname !== OFFLINE_ROUTE) {
      return json({ error: 'not found' }, 404);
    }
    if (request.method !== 'POST') return json({ error: 'method not allowed' }, 405);
    if (request.headers.get('origin') !== url.origin) {
      return json({ error: 'forbidden' }, 403);
    }
    if (!client) return json({ error: 'Gemini Live is not configured' }, 503);

    const declaredLength = Number(request.headers.get('content-length') ?? 0);
    if (declaredLength > MAX_REQUEST_BYTES) {
      return json({ error: 'request body is too large' }, 413);
    }
    try {
      const rawBody = await request.text();
      if (encoderByteLength(rawBody) > MAX_REQUEST_BYTES) {
        return json({ error: 'request body is too large' }, 413);
      }
      const body = JSON.parse(rawBody) as unknown;
      if (!isRecord(body)) throw new ClientRequestError('invalid JSON body');
      const { history, pcm } = readAudioTurn(body);
      return await createGeminiStream(
        request,
        client,
        history,
        pcm,
        systemPrompt,
        searchEnabled,
      );
    } catch (error) {
      if (error instanceof ClientRequestError || error instanceof SyntaxError) {
        return json({ error: error.message }, 400);
      }
      return json({ error: 'Gemini Live request failed' }, 502);
    }
  };
}

function encoderByteLength(value: string): number {
  return new TextEncoder().encode(value).byteLength;
}
