import { readdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesRoot = join(repoRoot, 'packages');

async function cleanPackageOutputs(): Promise<void> {
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const packageRoot = join(packagesRoot, entry.name);
    if (!(await Bun.file(join(packageRoot, 'package.json')).exists())) continue;
    await rm(join(packageRoot, 'dist'), { recursive: true, force: true });
    await rm(join(packageRoot, 'tsconfig.tsbuildinfo'), { force: true });
  }
}

async function buildPackages(): Promise<void> {
  await cleanPackageOutputs();
  const child = Bun.spawn(['bun', 'run', 'tsc', '-b'], {
    cwd: repoRoot,
    env: process.env,
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;
  if (exitCode !== 0) process.exit(exitCode);
}

await buildPackages();
