# Agent instructions — OtterVoice

This file is the agent contract for this repository. Follow it for every change that touches public packages or docs.

## Public API documentation (required)

For any **exported** symbol in `packages/*/src` (functions, classes, interfaces, type aliases, enums):

1. Write **JSDoc** that states what it is for and when to use it.
2. Document **every parameter** with `@param` (or a property doc comment on interface/type fields).
3. Document **return values** with `@returns` when non-obvious.
4. Prefer linking related types with `{@link SymbolName}`.
5. Keep comments in **English** — TypeDoc generates the API reference from them. Narrative docs under `docs/site` may be Chinese and/or English.

Do **not** ship new public options, events, or factories without these comments. If you change a public signature, update the JSDoc in the same PR.

### Minimum example

```ts
/**
 * Create a half-/full-duplex voice session.
 *
 * @param config - Runtime, providers, VAD, and policy. See {@link VoiceSessionConfig}.
 * @returns A {@link VoiceSession} that must be `dispose()`d when finished.
 */
export function createVoiceSession(config: VoiceSessionConfig): VoiceSession {
  return new VoiceSession(config);
}
```

```ts
export interface ExampleOptions {
  /** Short-lived token endpoint. Prefer this on clients over {@link ExampleOptions.apiKey}. */
  tokenBrokerUrl?: string;
  /** Long-lived provider key. Server-side only — never ship to browsers or apps. */
  apiKey?: string;
}
```

## Regenerating API docs

After changing JSDoc on exports:

```bash
cd docs/site && bun run build:api
# or full site: bun run build:site   (from repo root)
```

TypeDoc writes markdown under `docs/site/src/content/docs/en/reference/api/`; `scripts/sync-api-docs.ts` flattens `@ottervoice/<pkg>.md` → `ottervoice-<pkg>.md` (Astro content collections skip `@`-prefixed path segments), mirrors into the Chinese locale, and injects Starlight frontmatter. Generated files may be produced at build time — prefer fixing **source** comments over hand-editing generated markdown.

## Documentation site

- Stack: **Astro Starlight** (`docs/site`), locales: root `zh-CN` + `en`.
- Structure expectations:
  - **Quick start** (`getting-started/*`) — map to `examples/*`; add or update an example when a new primary scenario appears.
  - **Packages** — selection guide + one page per major package.
  - **Guides** — architecture, events, latency, security.
  - **API reference** — TypeDoc output only.
- Prefer tables and short code blocks over long prose. Link GitHub example paths with permanent `main` tree URLs.
- Do not recreate the old single-page bilingual HTML (`docs.html` / CSS “AI brochure” layout). Keep Starlight + `custom.css` (cool teal paper, restrained coral links — avoid purple neon, glow kits, and warm cream + terracotta defaults).

## Code change hygiene

- Match existing package boundaries: core stays platform-agnostic; platform APIs live in runtimes; vendor HTTP/WS live in providers.
- Add or update tests next to behavior changes under `packages/*/test`.
- Do not commit secrets (`.env`, long-lived API keys). Client examples must use `tokenBrokerUrl` or mocks.
- Do not create git commits unless the user explicitly asks.

## Validation

```bash
bun run typecheck
bun test
bun run build
bun run build:site
```
