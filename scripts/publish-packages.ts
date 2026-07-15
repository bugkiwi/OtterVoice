import { readdir } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

interface PackageManifest {
  name?: string;
  version?: string;
  private?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
}

interface PackageInfo {
  directory: string;
  manifest: PackageManifest & { name: string; version: string };
}

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagesRoot = join(repoRoot, 'packages');
const defaultPublishRegistry = 'https://registry.npmjs.org';
const dependencyFields = [
  'dependencies',
  'peerDependencies',
  'optionalDependencies',
] as const;

function usage(): void {
  console.log(`Publish every public package under packages/ in dependency order.

Usage: bun run publish:packages -- [options]

Script options:
  --dry-run       Build and inspect every package without npm authentication or upload.
  --skip-build    Skip the root "bun run build" step.
  -h, --help      Show this help.

Publishing defaults to https://registry.npmjs.org and reads its token from
NPM_CONFIG_TOKEN or the matching _authToken entry in your user/project .npmrc.
All other options are forwarded to each "bun publish" invocation.

Examples:
  bun run publish:packages -- --dry-run
  bun run publish:packages -- --tag next
  bun run publish:packages -- --tolerate-republish`);
}

async function run(
  command: string[],
  cwd: string,
  environment: Record<string, string> = {},
): Promise<void> {
  const child = Bun.spawn(command, {
    cwd,
    env: { ...process.env, ...environment },
    stdin: 'inherit',
    stdout: 'inherit',
    stderr: 'inherit',
  });
  const exitCode = await child.exited;

  if (exitCode !== 0) {
    throw new Error(`Command failed with exit code ${exitCode}: ${command.join(' ')}`);
  }
}

function optionValue(args: string[], option: string): string | undefined {
  const inlinePrefix = `${option}=`;
  const inline = args.find((arg) => arg.startsWith(inlinePrefix));
  if (inline) return inline.slice(inlinePrefix.length);

  const index = args.indexOf(option);
  return index >= 0 ? args[index + 1] : undefined;
}

function npmrcTokenKey(registry: string): string {
  const url = new URL(registry);
  const pathname = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return `//${url.host}${pathname}:_authToken`;
}

function resolveNpmrcValue(value: string): string | undefined {
  const unquoted = (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) ? value.slice(1, -1) : value;
  const environmentReference = unquoted.match(/^\$\{([A-Za-z_][A-Za-z0-9_]*)\}$/);

  return environmentReference ? process.env[environmentReference[1]] : unquoted || undefined;
}

async function resolvePublishToken(registry: string): Promise<string | undefined> {
  if (process.env.NPM_CONFIG_TOKEN) return process.env.NPM_CONFIG_TOKEN;

  const userConfig = process.env.NPM_CONFIG_USERCONFIG ?? join(homedir(), '.npmrc');
  const configFiles = [userConfig, join(repoRoot, '.npmrc')];
  const tokenKey = npmrcTokenKey(registry);
  let token: string | undefined;

  for (const configFile of configFiles) {
    const file = Bun.file(configFile);
    if (!(await file.exists())) continue;

    for (const rawLine of (await file.text()).split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#') || line.startsWith(';')) continue;

      const separator = line.indexOf('=');
      if (separator < 0 || line.slice(0, separator).trim() !== tokenKey) continue;
      token = resolveNpmrcValue(line.slice(separator + 1).trim());
    }
  }

  return token;
}

async function discoverPackages(): Promise<PackageInfo[]> {
  const entries = await readdir(packagesRoot, { withFileTypes: true });
  const packages: PackageInfo[] = [];

  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    if (!entry.isDirectory()) continue;

    const directory = join(packagesRoot, entry.name);
    const manifestFile = Bun.file(join(directory, 'package.json'));
    if (!(await manifestFile.exists())) continue;

    const manifest = (await manifestFile.json()) as PackageManifest;
    if (manifest.private) {
      console.log(`Skipping private package: ${relative(repoRoot, directory)}`);
      continue;
    }
    if (!manifest.name || !manifest.version) {
      throw new Error(`${relative(repoRoot, directory)}/package.json must define name and version.`);
    }

    packages.push({
      directory,
      manifest: manifest as PackageInfo['manifest'],
    });
  }

  if (packages.length === 0) {
    throw new Error('No public packages were found under packages/.');
  }

  return packages;
}

function sortByDependencies(packages: PackageInfo[]): PackageInfo[] {
  const packagesByName = new Map(packages.map((pkg) => [pkg.manifest.name, pkg]));
  if (packagesByName.size !== packages.length) {
    throw new Error('Package names under packages/ must be unique.');
  }

  const result: PackageInfo[] = [];
  const states = new Map<string, 'visiting' | 'visited'>();
  const stack: string[] = [];

  function visit(pkg: PackageInfo): void {
    const name = pkg.manifest.name;
    const state = states.get(name);
    if (state === 'visited') return;
    if (state === 'visiting') {
      const cycleStart = stack.indexOf(name);
      const cycle = [...stack.slice(cycleStart), name].join(' -> ');
      throw new Error(`Internal package dependency cycle detected: ${cycle}`);
    }

    states.set(name, 'visiting');
    stack.push(name);

    const internalDependencies = new Set<string>();
    for (const field of dependencyFields) {
      for (const dependencyName of Object.keys(pkg.manifest[field] ?? {})) {
        if (packagesByName.has(dependencyName)) internalDependencies.add(dependencyName);
      }
    }
    for (const dependencyName of [...internalDependencies].sort()) {
      visit(packagesByName.get(dependencyName)!);
    }

    stack.pop();
    states.set(name, 'visited');
    result.push(pkg);
  }

  for (const pkg of [...packages].sort((left, right) =>
    left.manifest.name.localeCompare(right.manifest.name),
  )) {
    visit(pkg);
  }

  return result;
}

async function main(): Promise<void> {
  const args = Bun.argv.slice(2).filter((arg) => arg !== '--');
  if (args.includes('-h') || args.includes('--help')) {
    usage();
    return;
  }

  const skipBuild = args.includes('--skip-build');
  const publishArgs = args.filter((arg) => arg !== '--skip-build');
  const dryRun = publishArgs.includes('--dry-run');
  const registry = optionValue(publishArgs, '--registry') ?? defaultPublishRegistry;
  const effectivePublishArgs = optionValue(publishArgs, '--registry')
    ? publishArgs
    : [...publishArgs, '--registry', registry];
  const publishToken = dryRun ? undefined : await resolvePublishToken(registry);
  if (!dryRun && !publishToken) {
    throw new Error(
      `No authentication token was found for ${registry}. ` +
      'Run npm login for that registry or set NPM_CONFIG_TOKEN.',
    );
  }
  const packages = sortByDependencies(await discoverPackages());

  console.log('Publish order:');
  for (const [index, pkg] of packages.entries()) {
    console.log(`  ${index + 1}. ${pkg.manifest.name}@${pkg.manifest.version}`);
  }

  if (!skipBuild) {
    console.log('\nBuilding all packages...');
    await run(['bun', 'run', 'build'], repoRoot);
  }

  for (const [index, pkg] of packages.entries()) {
    const verb = dryRun ? 'Inspecting' : 'Publishing';
    console.log(`\n[${index + 1}/${packages.length}] ${verb} ${pkg.manifest.name}@${pkg.manifest.version}...`);
    if (dryRun) {
      await run(['bun', 'pm', 'pack', '--dry-run'], pkg.directory);
    } else {
      await run(
        ['bun', 'publish', ...effectivePublishArgs],
        pkg.directory,
        { NPM_CONFIG_TOKEN: publishToken! },
      );
    }
  }

  const action = dryRun ? 'Dry run completed for' : 'Published';
  console.log(`\n${action} ${packages.length} package(s) successfully.`);
}

await main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`\nPublish failed: ${message}`);
  process.exit(1);
});
