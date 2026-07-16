import type {
  ASRProvider,
  LLMProvider,
  PronunciationProvider,
  TTSProvider,
} from './types.js';
import { VoiceError } from './errors.js';

/**
 * Built-in named stacks in {@link providerProfiles}.
 * Pass to {@link ProviderRegistry.resolve} or {@link resolveProfile}.
 */
export type ProviderProfileName =
  | 'global_budget'
  | 'global_pro'
  | 'china_fallback'
  | 'developer_test';

/**
 * Provider-id recipe for one product mode. String values are registry keys
 * resolved by {@link ProviderRegistry} into concrete adapters — never vendor SDK imports.
 */
export interface ProviderProfile {
  /** Stable profile id (usually matches a {@link ProviderProfileName}). */
  name: string;
  /** Registered ASR provider id. */
  asr: string;
  /** Registered LLM used for conversational turns. */
  llmConversation: string;
  /** Optional LLM used for scoring / reports; defaults to conversation LLM. */
  llmScoring?: string;
  /** Optional TTS provider id for the classic pipeline. */
  tts?: string;
  /** Optional pronunciation / assessment provider id. */
  pronunciation?: string;
}

/**
 * Built-in composition profiles for trusted application code. They are not an
 * authorization or subscription boundary: a server must decide which profile
 * an untrusted client may use. The string values are *provider ids* that a
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

/** Deployment region hint for {@link resolveProfile}. */
export type ProviderRegion = 'global' | 'china' | 'unknown';
/** Commercial plan hint for {@link resolveProfile}. */
export type ProviderPlan = 'free' | 'basic' | 'pro';
/**
 * Feature being routed (reserved for finer policy; {@link resolveProfile}
 * currently keys primarily on region / plan).
 */
export type ProviderFeature =
  | 'conversation'
  | 'transcription'
  | 'scoring'
  | 'pronunciation';

/**
 * Inputs for {@link resolveProfile}.
 * Prefer setting {@link ProviderRoutingContext.region} and
 * {@link ProviderRoutingContext.plan}; latency/cost are forward-compatible knobs.
 */
export interface ProviderRoutingContext {
  /** User / deployment region. */
  region?: ProviderRegion;
  /** Subscription tier. */
  plan?: ProviderPlan;
  /** Feature being selected (optional; ignored by the default policy). */
  feature?: ProviderFeature;
  /** Prefer lower latency when a future policy uses it. */
  latencyPreference?: 'low' | 'balanced' | 'quality';
  /** Prefer lower cost when a future policy uses it. */
  costPreference?: 'low' | 'balanced' | 'quality';
}

/**
 * Resolve the built-in composition default. This is not an entitlement check;
 * trusted server code must validate a user's real plan before exposing a profile.
 *
 * @param ctx - Trusted deployment/user routing facts.
 * @returns The matching built-in provider profile name.
 */
export function resolveProfile(
  ctx: ProviderRoutingContext = {},
): ProviderProfileName {
  if (ctx.region === 'china') return 'china_fallback';
  if (ctx.plan === 'pro') return 'global_pro';
  return 'global_budget';
}

/**
 * Initial map of provider ids → instances for the {@link ProviderRegistry}
 * constructor. Keys must match those used in {@link ProviderProfile}.
 */
export interface RegisteredProviders {
  /** ASR adapters keyed by profile `asr` id. */
  asr?: Record<string, ASRProvider>;
  /** LLM adapters keyed by conversation / scoring ids. */
  llm?: Record<string, LLMProvider>;
  /** TTS adapters keyed by profile `tts` id. */
  tts?: Record<string, TTSProvider>;
  /** Pronunciation adapters keyed by profile `pronunciation` id. */
  pronunciation?: Record<string, PronunciationProvider>;
}

/**
 * Concrete provider bundle produced by {@link ProviderRegistry.resolve}.
 * Ready to pass into a {@link import('./session').VoiceSession} config.
 */
export interface ResolvedProviders {
  /** Live ASR for the classic pipeline. */
  asr: ASRProvider;
  /** Conversational text LLM. */
  llm: LLMProvider;
  /** LLM used for scoring / reports (may alias {@link ResolvedProviders.llm}). */
  llmScoring: LLMProvider;
  /** Optional TTS when synthesizing speech separately. */
  tts?: TTSProvider;
  /** Optional pronunciation assessor. */
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
