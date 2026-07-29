import { createGeminiLiveGateway } from '../../examples/web/gemini-live-proxy.js';
import { createDemoVoiceGateway } from '../../examples/web/openrouter-proxy.js';
import { DEMO_VOICE_PROFILE } from '../../examples/web/voice-profile.js';

declare const process: {
  readonly env: {
    readonly OPENROUTER_API_KEY?: string;
    readonly AISTUDIO_GOOGLE_API_KEY?: string;
    readonly GEMINI_API_KEY?: string;
    readonly GOOGLE_API_KEY?: string;
  };
};

type VoiceGateway = (request: Request) => Promise<Response>;

/** Create the production dispatcher without duplicating provider policy. */
export function createVoiceProxy(gateways: {
  openRouter: VoiceGateway;
  geminiLive: VoiceGateway;
}): VoiceGateway {
  return (request) => {
    const pathname = new URL(request.url).pathname;
    return pathname.startsWith(`${DEMO_VOICE_PROFILE.prefixes.google}/`)
      ? gateways.geminiLive(request)
      : gateways.openRouter(request);
  };
}

const openRouterGateway = createDemoVoiceGateway(
  process.env.OPENROUTER_API_KEY,
  {
    referer: 'https://ottervoice.vercel.app',
    title: 'OtterVoice Docs',
  },
);
const geminiLiveGateway = createGeminiLiveGateway({
  apiKey: process.env.AISTUDIO_GOOGLE_API_KEY ??
    process.env.GEMINI_API_KEY ??
    process.env.GOOGLE_API_KEY,
});

export const proxyVoice = createVoiceProxy({
  openRouter: openRouterGateway,
  geminiLive: geminiLiveGateway,
});
