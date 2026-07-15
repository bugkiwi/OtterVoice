/**
 * Normalize TypeDoc markdown for Starlight:
 * - Flatten `@ottervoice/<pkg>.md` → `ottervoice-<pkg>.md` (Astro content
 *   collections skip paths whose segments start with `@`).
 * - Drop TypeDoc `_media` artifacts.
 * - Inject Starlight frontmatter.
 * - Mirror English output into the Chinese (root) locale and rewrite URLs.
 */
import { cp, mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

const enApi = new URL('../src/content/docs/en/reference/api/', import.meta.url);
const zhApi = new URL('../src/content/docs/reference/api/', import.meta.url);

const scopedDir = join(enApi.pathname, '@ottervoice');

async function flattenScopedPackages(): Promise<void> {
  try {
    const entries = await readdir(scopedDir);
    for (const name of entries) {
      if (!name.endsWith('.md') && !name.endsWith('.mdx')) continue;
      const from = join(scopedDir, name);
      const to = join(enApi.pathname, `ottervoice-${name}`);
      await rename(from, to);
    }
    await rm(scopedDir, { recursive: true, force: true });
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
  }

  await rm(join(enApi.pathname, '_media'), { recursive: true, force: true });
}

/** Rewrite TypeDoc scoped-package links for flattened Starlight routes. */
function rewritePackagePaths(markdown: string): string {
  return markdown
    .replaceAll('/@ottervoice/', '/ottervoice-')
    .replaceAll('/@ottervoice', '/')
    .replace(/\]\(\.?\/?@ottervoice\//g, '](./ottervoice-')
    .replace(/\]\(\.\.\/@ottervoice\//g, '](../ottervoice-')
    .replace(/\(@ottervoice\//g, '(ottervoice-');
}

async function walk(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else if (entry.name.endsWith('.md') || entry.name.endsWith('.mdx')) files.push(path);
  }
  return files;
}

/** Strip `.md` from internal markdown/href links so Starlight routes resolve. */
function rewriteLinks(markdown: string, locale: 'en' | 'zh'): string {
  let out = rewritePackagePaths(markdown);
  out = out.replace(/(\]\([^)\s]+)\.md(#[^)\s]*)?\)/g, '$1/$2)');
  out = out.replace(/(href="[^"\s]+)\.md(#[^"\s]*)?"/g, '$1/$2"');

  if (locale === 'zh') {
    out = out.replaceAll('/docs/en/reference/api/', '/docs/reference/api/');
  }
  return out;
}

async function injectFrontmatter(file: string, locale: 'en' | 'zh'): Promise<void> {
  let raw = await readFile(file, 'utf8');
  raw = rewriteLinks(raw, locale);

  const rel = relative(
    locale === 'en' ? enApi.pathname : zhApi.pathname,
    file,
  ).replace(/\\/g, '/');

  const title =
    rel === 'index.md'
      ? 'API'
      : rel
          .replace(/\.mdx?$/, '')
          .replace(/^ottervoice-/, '@ottervoice/')
          .replace(/_/g, ' ');

  const description =
    locale === 'zh'
      ? '由 TypeDoc 从源码 JSDoc 生成的 API 参考（英文注释）。'
      : 'API reference generated from source JSDoc via TypeDoc.';

  // Always re-wrap so titles stay in sync after rename.
  const bodyWithoutFm = raw.startsWith('---\n')
    ? raw.replace(/^---\n[\s\S]*?\n---\n*/, '')
    : raw;

  const body = `---
title: ${JSON.stringify(title)}
description: ${JSON.stringify(description)}
editUrl: false
---

${bodyWithoutFm}`;
  await writeFile(file, body);
}

await flattenScopedPackages();

await rm(zhApi.pathname, { recursive: true, force: true });
await mkdir(zhApi.pathname, { recursive: true });
await cp(enApi.pathname, zhApi.pathname, { recursive: true });

for (const file of await walk(enApi.pathname)) await injectFrontmatter(file, 'en');
for (const file of await walk(zhApi.pathname)) await injectFrontmatter(file, 'zh');

console.log('Synced TypeDoc API docs into zh + en locales (flattened @ottervoice/*).');
