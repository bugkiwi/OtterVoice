import type { DemoVoiceLanguage } from './voice-language';

type DemoVoicePromptCopy = {
  systemPrompt: (date: string) => string;
  searchOutputInstruction: string;
  historyIntroduction: string;
  userRole: string;
  assistantRole: string;
};

const promptCopy: Record<DemoVoiceLanguage, DemoVoicePromptCopy> = {
  zh: {
    systemPrompt: (date) =>
      `当前日期是 ${date}。对时效性信息，在可用时必须使用联网搜索核实。` +
      '你是一个反应快、语气自然的语音对话助手。当前界面语言是中文，默认始终使用中文回复；只有用户明确要求切换语言时才使用其他语言。' +
      '第一句立即给出结论；每次只回复 1–5 个简短句子，不使用 Markdown，不列表，只输出适合直接语音播放的自然语言正文。',
    searchOutputInstruction:
      '联网搜索结果只用于内部核实。最终回答只输出适合朗读的自然语言正文；' +
      '禁止输出引用编号、脚注、URL、域名、Markdown 链接、来源或参考资料列表。',
    historyIntroduction: '以下是此前已完成的对话，仅作为当前语音问题的上下文：',
    userRole: '用户',
    assistantRole: '助手',
  },
  en: {
    systemPrompt: (date) =>
      `The current date is ${date}. Verify time-sensitive information with web search whenever it is available. ` +
      'You are a fast, natural-sounding voice assistant. The current interface language is English, so respond in English by default; use another language only when the user explicitly asks you to switch. ' +
      'Lead with the answer. Reply in 1–5 short sentences without Markdown or lists, and output only natural prose suitable for immediate speech playback.',
    searchOutputInstruction:
      'Use web search results only for internal verification. The final answer must contain only natural prose suitable for speech; ' +
      'do not output citation numbers, footnotes, URLs, domains, Markdown links, sources, or reference lists.',
    historyIntroduction: 'The following completed conversation is context for the current voice question:',
    userRole: 'User',
    assistantRole: 'Assistant',
  },
};

/** Build the server-owned system prompt matching the selected interface language. */
export function createDemoVoiceSystemPrompt(
  language: DemoVoiceLanguage,
  date = new Date().toISOString().slice(0, 10),
): string {
  return promptCopy[language].systemPrompt(date);
}

/** Return the server-owned spoken-output policy for search-assisted replies. */
export function demoSearchOutputInstruction(language: DemoVoiceLanguage): string {
  return promptCopy[language].searchOutputInstruction;
}

/** Return localized labels used when injecting prior conversation context. */
export function demoHistoryPromptCopy(language: DemoVoiceLanguage): Pick<
  DemoVoicePromptCopy,
  'historyIntroduction' | 'userRole' | 'assistantRole'
> {
  const { historyIntroduction, userRole, assistantRole } = promptCopy[language];
  return { historyIntroduction, userRole, assistantRole };
}
