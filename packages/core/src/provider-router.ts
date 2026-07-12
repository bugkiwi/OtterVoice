import type {
  ASRProvider,
  LLMProvider,
  PronunciationProvider,
  TTSProvider,
} from './types';
import { VoiceError } from './errors';

export type ProviderProfileName =
  | 'global_budget'
  | 'global_pro'
  | 'china_fallback'
  | 'developer_test';

export interface ProviderProfile {
  name: string;
  asr: string;
  llmConversation: string;
  llmScoring?: string;
  tts?: string;
  pronunciation?: string;
}

/**
 * Built-in profiles. The string values are *provider ids* that a
 * {@link ProviderRegistry} resolves into concrete provider instances — the
 * router never imports a vendor SDK itself.
 */
export const providerProfiles = {
  global_budget: {
    name: 'global_budget',
    asr: 'elevenlabs_scribe_realtime',
    llmConversation: 'openrouter_gemini_flash_lite',
    llmScoring: 'openrouter_gemini_flash',
    tts: 'azure_neural_tts',
    pronunciation: 'approximation',
  },
  global_pro: {
    name: 'global_pro',
    asr: 'deepgram_nova_streaming',
    llmConversation: 'openrouter_gemini_flash',
    llmScoring: 'openai_or_claude',
    tts: 'elevenlabs_flash',
    pronunciation: 'azure_pronunciation',
  },
  china_fallback: {
    name: 'china_fallback',
    asr: 'xfyun_streaming',
    llmConversation: 'deepseek_or_qwen',
    llmScoring: 'deepseek_or_qwen',
    tts: 'xfyun_tts',
    pronunciation: 'xfyun_or_approximation',
  },
  developer_test: {
    name: 'developer_test',
    asr: 'mock_asr',
    llmConversation: 'mock_llm',
    llmScoring: 'mock_llm',
    tts: 'mock_tts',
    pronunciation: 'mock_pronunciation',
  },
} satisfies Record<ProviderProfileName, ProviderProfile>;

export type ProviderRegion = 'global' | 'china' | 'unknown';
export type ProviderPlan = 'free' | 'basic' | 'pro';
export type ProviderFeature =
  | 'conversation'
  | 'transcription'
  | 'scoring'
  | 'pronunciation';

export interface ProviderRoutingContext {
  region?: ProviderRegion;
  plan?: ProviderPlan;
  feature?: ProviderFeature;
  latencyPreference?: 'low' | 'balanced' | 'quality';
  costPreference?: 'low' | 'balanced' | 'quality';
}

/** Default policy: China routes to the fallback profile, Pro plans to pro. */
export function resolveProfile(
  ctx: ProviderRoutingContext = {},
): ProviderProfileName {
  if (ctx.region === 'china') return 'china_fallback';
  if (ctx.plan === 'pro') return 'global_pro';
  return 'global_budget';
}

export interface RegisteredProviders {
  asr?: Record<string, ASRProvider>;
  llm?: Record<string, LLMProvider>;
  tts?: Record<string, TTSProvider>;
  pronunciation?: Record<string, PronunciationProvider>;
}

export interface ResolvedProviders {
  asr: ASRProvider;
  llm: LLMProvider;
  llmScoring: LLMProvider;
  tts?: TTSProvider;
  pronunciation?: PronunciationProvider;
}

/**
 * Maps provider ids (as used in {@link ProviderProfile}) to concrete provider
 * instances, and resolves a profile into a usable {@link ResolvedProviders}
 * bundle for a {@link import('./session').VoiceSession}.
 */
export class ProviderRegistry {
  private readonly asr = new Map<string, ASRProvider>();
  private readonly llm = new Map<string, LLMProvider>();
  private readonly tts = new Map<string, TTSProvider>();
  private readonly pronunciation = new Map<string, PronunciationProvider>();

  constructor(initial?: RegisteredProviders) {
    if (initial?.asr) {
      for (const [id, p] of Object.entries(initial.asr)) this.registerASR(id, p);
    }
    if (initial?.llm) {
      for (const [id, p] of Object.entries(initial.llm)) this.registerLLM(id, p);
    }
    if (initial?.tts) {
      for (const [id, p] of Object.entries(initial.tts)) this.registerTTS(id, p);
    }
    if (initial?.pronunciation) {
      for (const [id, p] of Object.entries(initial.pronunciation)) {
        this.registerPronunciation(id, p);
      }
    }
  }

  registerASR(id: string, provider: ASRProvider): this {
    this.asr.set(id, provider);
    return this;
  }

  registerLLM(id: string, provider: LLMProvider): this {
    this.llm.set(id, provider);
    return this;
  }

  registerTTS(id: string, provider: TTSProvider): this {
    this.tts.set(id, provider);
    return this;
  }

  registerPronunciation(id: string, provider: PronunciationProvider): this {
    this.pronunciation.set(id, provider);
    return this;
  }

  getProfile(name: ProviderProfileName): ProviderProfile {
    return providerProfiles[name];
  }

  resolve(profileOrName: ProviderProfileName | ProviderProfile): ResolvedProviders {
    const profile =
      typeof profileOrName === 'string'
        ? this.getProfile(profileOrName)
        : profileOrName;

    const asr = this.requireFrom(this.asr, profile.asr, 'asr');
    const llm = this.requireFrom(this.llm, profile.llmConversation, 'llm');
    const llmScoring = profile.llmScoring
      ? this.requireFrom(this.llm, profile.llmScoring, 'llm')
      : llm;

    const resolved: ResolvedProviders = { asr, llm, llmScoring };
    if (profile.tts) {
      resolved.tts = this.requireFrom(this.tts, profile.tts, 'tts');
    }
    if (profile.pronunciation) {
      resolved.pronunciation = this.requireFrom(
        this.pronunciation,
        profile.pronunciation,
        'pronunciation',
      );
    }
    return resolved;
  }

  private requireFrom<T>(map: Map<string, T>, id: string, kind: string): T {
    const provider = map.get(id);
    if (!provider) {
      throw new VoiceError({
        code: 'unsupported_runtime',
        message: `No ${kind} provider registered for id "${id}"`,
        retryable: false,
      });
    }
    return provider;
  }
}
