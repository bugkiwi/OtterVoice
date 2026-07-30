/** Languages supported by the Web demo's interface and voice policy. */
export type DemoVoiceLanguage = 'zh' | 'en';

/** Allowlisted request header used to select a server-owned voice policy. */
export const DEMO_VOICE_LANGUAGE_HEADER = 'x-ottervoice-language';

/** Normalize an untrusted client language value to a supported demo language. */
export function normalizeDemoVoiceLanguage(value: string | null): DemoVoiceLanguage {
  return value?.trim().toLowerCase() === 'en' ? 'en' : 'zh';
}

/** Read the allowlisted voice language from a gateway request. */
export function demoVoiceLanguageFromRequest(request: Request): DemoVoiceLanguage {
  return normalizeDemoVoiceLanguage(request.headers.get(DEMO_VOICE_LANGUAGE_HEADER));
}

/** Build the non-privileged language header sent by a demo client. */
export function demoVoiceLanguageHeaders(
  language: DemoVoiceLanguage,
): Record<string, string> {
  return { [DEMO_VOICE_LANGUAGE_HEADER]: language };
}
