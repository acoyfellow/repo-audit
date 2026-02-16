import { describe, expect, it, vi } from 'vitest';
import { scoreRepo } from './scoreRepo';
import type { GitHubRepoData } from './github';

function mkData(overrides: Partial<GitHubRepoData> = {}): GitHubRepoData {
  return {
    meta: {
      full_name: 'a/b',
      description: 'A useful thing',
      topics: ['x', 'y', 'z'],
      stargazers_count: 120,
      forks_count: 15,
      open_issues_count: 4,
      homepage: 'https://example.com',
      default_branch: 'main',
      created_at: '2020-01-02T00:00:00Z',
      language: 'TypeScript',
      has_wiki: true,
      has_discussions: true,
      allow_forking: true,
      archived: false,
      license: { spdx_id: 'MIT', name: 'MIT' },
    },
    community: {
      files: {
        security: { url: 'x' },
        contributing: { url: 'x' },
        code_of_conduct: { url: 'x' },
        issue_template: { url: 'x' },
        pull_request_template: { url: 'x' },
      },
    },
    readme: '## Install\n\n```sh\nnpm i\n```\n\n## Usage\n\nExample.\n\n![screenshot](x.png)\n\nLicense: MIT\nDiscord',
    rootFiles: ['readme.md', 'license', 'package-lock.json', '.gitignore', 'src'],
    allPaths: [
      'src/index.ts',
      'src/foo.test.ts',
      '.github/workflows/ci.yml',
      'docs/index.md',
      'changelog.md',
      'dependabot.yml',
      'playwright.config.ts',
      '.eslintrc',
      '.editorconfig',
      '.env.example',
    ],
    releases: [{ id: 1 }, { id: 2 }],
    workflows: [{ id: 1 }, { id: 2 }, { id: 3 }],
    contributors: [{ contributions: 50 }, { contributions: 20 }, { contributions: 1 }],
    commits: [{ commit: { author: { date: '2026-02-10T00:00:00Z' } } }],
    ...overrides,
  };
}

describe('scoreRepo', () => {
  it('returns all categories with scores in [0,10]', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T00:00:00Z'));

    const r = scoreRepo(mkData());
    const keys = Object.keys(r.scores);
    expect(keys.length).toBe(11);
    for (const [k, v] of Object.entries(r.scores)) {
      expect(typeof k).toBe('string');
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(10);
    }

    vi.useRealTimers();
  });

  it('marks archived repos as capped maintenance', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T00:00:00Z'));

    const r = scoreRepo(mkData({ meta: { ...mkData().meta, archived: true } }));
    expect(r.scores.maintenance).toBeLessThanOrEqual(2);
    expect(r.details.maintenance[0]).toBe('ARCHIVED');

    vi.useRealTimers();
  });

  it('flags missing README / license in details', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T00:00:00Z'));

    const r = scoreRepo(
      mkData({
        readme: '',
        meta: { ...mkData().meta, license: null },
      }) as any,
    );
    expect(r.details.readme.join(' ')).toMatch(/No README|thin/i);
    expect(r.details.licensing.join(' ')).toMatch(/NO LICENSE FILE/i);

    vi.useRealTimers();
  });

  it('awards points for tsconfig strict mode', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T00:00:00Z'));

    const strict = scoreRepo(
      mkData({ tsconfigContent: JSON.stringify({ compilerOptions: { strict: true } }) }),
    );
    expect(strict.details.codeQuality).toContain('strict mode enabled');

    const partial = scoreRepo(
      mkData({
        tsconfigContent: JSON.stringify({
          compilerOptions: { noImplicitAny: true, strictNullChecks: true, strictFunctionTypes: true },
        }),
      }),
    );
    expect(partial.details.codeQuality.join(' ')).toMatch(/3\/4 strict flags/);

    const weak = scoreRepo(
      mkData({
        tsconfigContent: JSON.stringify({
          compilerOptions: { noImplicitAny: false },
        }),
      }),
    );
    expect(weak.details.codeQuality).toContain('No strict flags in tsconfig');
    expect(weak.details.codeQuality).toContain('noImplicitAny disabled \u2014 weak typing');

    const none = scoreRepo(mkData({ tsconfigContent: undefined }));
    expect(none.details.codeQuality).not.toContain('strict mode enabled');

    vi.useRealTimers();
  });

  it('recognizes Diataxis doc structure', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-02-14T00:00:00Z'));

    const r = scoreRepo(
      mkData({
        allPaths: [
          ...mkData().allPaths,
          'docs/tutorials/first-audit.md',
          'docs/how-to/workers-ai.md',
          'docs/reference/api.md',
          'docs/explanation/architecture.md',
        ],
      }),
    );
    expect(r.details.documentation.join(' ')).toMatch(/Diataxis/i);
    expect(r.details.documentation.join(' ')).toMatch(/tutorials/i);

    vi.useRealTimers();
  });
});
