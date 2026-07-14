type DocsLanguage = 'zh' | 'en';

const root = document.documentElement;
const zhButton = document.querySelector<HTMLButtonElement>('#docs-lang-zh');
const enButton = document.querySelector<HTMLButtonElement>('#docs-lang-en');
const copyButtons = [...document.querySelectorAll<HTMLButtonElement>('[data-copy]')];

function initialLanguage(): DocsLanguage {
  const saved = localStorage.getItem('ottervoice-language');
  if (saved === 'zh' || saved === 'en') return saved;
  return navigator.language.toLowerCase().startsWith('zh') ? 'zh' : 'en';
}

function applyLanguage(language: DocsLanguage): void {
  root.dataset.language = language;
  root.lang = language === 'zh' ? 'zh-CN' : 'en';
  localStorage.setItem('ottervoice-language', language);
  zhButton?.classList.toggle('selected', language === 'zh');
  enButton?.classList.toggle('selected', language === 'en');
  zhButton?.setAttribute('aria-pressed', String(language === 'zh'));
  enButton?.setAttribute('aria-pressed', String(language === 'en'));
  document.title = language === 'zh'
    ? 'OtterVoice 技术文档'
    : 'OtterVoice Technical Documentation';
  document
    .querySelector<HTMLMetaElement>('meta[name="description"]')
    ?.setAttribute(
      'content',
      language === 'zh'
        ? 'OtterVoice Web、Expo 与 Node.js 实时语音 SDK 技术接入文档。'
        : 'Technical integration guide for the OtterVoice real-time voice SDK on Web, Expo, and Node.js.',
    );
  for (const button of copyButtons) {
    button.textContent = language === 'zh' ? '复制' : 'Copy';
  }
}

zhButton?.addEventListener('click', () => applyLanguage('zh'));
enButton?.addEventListener('click', () => applyLanguage('en'));

for (const button of copyButtons) {
  button.addEventListener('click', async () => {
    const code = button.closest('.code-block')?.querySelector('code')?.textContent ?? '';
    const language = root.dataset.language === 'en' ? 'en' : 'zh';
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = language === 'zh' ? '已复制' : 'Copied';
    } catch {
      button.textContent = language === 'zh' ? '复制失败' : 'Copy failed';
    }
    window.setTimeout(() => {
      button.textContent = language === 'zh' ? '复制' : 'Copy';
    }, 1_500);
  });
}

const sections = [...document.querySelectorAll<HTMLElement>('main section[id]')];
const tocLinks = [...document.querySelectorAll<HTMLAnchorElement>('.toc a')];
const observer = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
    if (!visible) return;
    for (const link of tocLinks) {
      const active = link.hash === `#${visible.target.id}`;
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    }
  },
  { rootMargin: '-18% 0px -68% 0px' },
);

for (const section of sections) observer.observe(section);
applyLanguage(initialLanguage());
