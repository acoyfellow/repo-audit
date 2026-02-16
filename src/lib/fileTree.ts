export type FileTreeGroup = 'source' | 'tests' | 'config' | 'docs' | 'ci' | 'assets' | 'build' | 'other';

export type AnnotatedEntry = {
  path: string;
  group: FileTreeGroup;
  label?: string;
};

export type FileTreeSummary = {
  totalFiles: number;
  groups: Record<FileTreeGroup, number>;
  topDirs: AnnotatedEntry[];
  highlights: string[];
};

const GROUP_PATTERNS: [RegExp, FileTreeGroup, string?][] = [
  [/^src\/|^lib\/|^pkg\/|^app\/|^packages\//, 'source', 'Source code'],
  [/^test[s]?\/|^__tests__\/|^spec\/|\.test\.|\.spec\.|_test\.go/, 'tests', 'Tests'],
  [/^docs?\/|^documentation\/|^wiki\//, 'docs', 'Documentation'],
  [/^\.github\/|^\.gitlab-ci|^\.circleci|^\.travis/, 'ci', 'CI/CD'],
  [/^dist\/|^build\/|^out\/|^\.next\/|^target\//, 'build', 'Build output'],
  [/^assets?\/|^static\/|^public\/|^images?\/|^media\//, 'assets', 'Assets'],
  [/^\./, 'config', 'Config'],
  [/\.(json|ya?ml|toml|ini|cfg)$/, 'config', 'Config'],
  [/^(readme|license|changelog|contributing|code_of_conduct|security)/i, 'docs', 'Documentation'],
];

function classify(path: string): FileTreeGroup {
  const lower = path.toLowerCase();
  for (const [re, group] of GROUP_PATTERNS) {
    if (re.test(lower)) return group;
  }
  return 'other';
}

export function buildFileTree(allPaths: string[]): FileTreeSummary {
  const groups: Record<FileTreeGroup, number> = {
    source: 0, tests: 0, config: 0, docs: 0, ci: 0, assets: 0, build: 0, other: 0,
  };

  for (const p of allPaths) {
    groups[classify(p)]++;
  }

  // Annotate top-level dirs
  const topLevelSet = new Map<string, FileTreeGroup>();
  for (const p of allPaths) {
    const slash = p.indexOf('/');
    const entry = slash === -1 ? p : p.slice(0, slash + 1);
    if (!topLevelSet.has(entry)) {
      topLevelSet.set(entry, classify(p));
    }
  }

  const DIR_LABELS: Record<string, string> = {
    'src/': 'Source code',
    'lib/': 'Library code',
    'app/': 'Application code',
    'pkg/': 'Packages',
    'packages/': 'Monorepo packages',
    'test/': 'Tests',
    'tests/': 'Tests',
    '__tests__/': 'Tests',
    'spec/': 'Test specs',
    'docs/': 'Documentation',
    'doc/': 'Documentation',
    '.github/': 'GitHub config & CI',
    'dist/': 'Build output',
    'build/': 'Build output',
    'out/': 'Build output',
    'public/': 'Static assets',
    'static/': 'Static assets',
    'assets/': 'Assets',
    'examples/': 'Usage examples',
    'example/': 'Usage examples',
    'scripts/': 'Build/dev scripts',
    'bin/': 'CLI binaries',
    'cmd/': 'CLI commands (Go)',
    'internal/': 'Internal packages (Go)',
    'migrations/': 'DB migrations',
    '.vscode/': 'VS Code config',
    '.devcontainer/': 'Dev container',
    'cypress/': 'E2E tests (Cypress)',
    'e2e/': 'E2E tests',
    'fixtures/': 'Test fixtures',
    'vendor/': 'Vendored deps',
    'node_modules/': 'Dependencies',
  };

  const topDirs: AnnotatedEntry[] = [];
  for (const [path, group] of topLevelSet) {
    topDirs.push({
      path,
      group,
      label: DIR_LABELS[path.toLowerCase()] || undefined,
    });
  }

  // Sort: dirs first (has /), then files; alphabetical within each group
  topDirs.sort((a, b) => {
    const aDir = a.path.endsWith('/') ? 0 : 1;
    const bDir = b.path.endsWith('/') ? 0 : 1;
    if (aDir !== bDir) return aDir - bDir;
    return a.path.localeCompare(b.path);
  });

  // Generate highlights
  const highlights: string[] = [];
  const total = allPaths.length;
  if (total > 0) {
    const srcPct = Math.round((groups.source / total) * 100);
    const testPct = Math.round((groups.tests / total) * 100);
    const configPct = Math.round((groups.config / total) * 100);

    if (srcPct > 0) highlights.push(`${srcPct}% source code`);
    if (testPct > 0) highlights.push(`${testPct}% tests`);
    else highlights.push('0% tests');
    if (configPct > 30) highlights.push(`${configPct}% config (heavy)`);
    if (groups.docs > 0) highlights.push(`${groups.docs} doc files`);
    if (groups.tests === 0 && groups.source > 0) highlights.push('No test files detected');
  }

  return { totalFiles: total, groups, topDirs, highlights };
}
