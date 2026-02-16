import { bench, describe } from 'vitest';
import { scoreRepo } from '../src/lib/scoreRepo';
import type { GitHubRepoData } from '../src/lib/github';

const mockData: GitHubRepoData = {
  meta: {
    full_name: 'test/repo',
    description: 'A test repository for benchmarking',
    stargazers_count: 100,
    forks_count: 10,
    open_issues_count: 5,
    topics: ['test', 'benchmark', 'scoring'],
    homepage: 'https://example.com',
    language: 'TypeScript',
    license: { spdx_id: 'MIT', name: 'MIT License' },
    has_wiki: true,
    has_discussions: false,
    archived: false,
    allow_forking: true,
    created_at: '2024-01-01T00:00:00Z',
  },
  community: { files: {} },
  readme: '# Test\n\n## Install\n\n```bash\nnpm install test\n```\n\n## Usage\n\nExample usage here.',
  rootFiles: ['README.md', 'LICENSE', 'package.json'],
  allPaths: ['src/index.ts', 'tests/test.ts', 'docs/README.md'],
  releases: [],
  workflows: [{ name: 'CI', path: '.github/workflows/ci.yml' }],
  contributors: [{ login: 'test', contributions: 50 }],
  commits: [{ commit: { author: { date: new Date().toISOString() } } }],
};

describe('scoreRepo benchmark', () => {
  bench('score a typical repo', () => {
    scoreRepo(mockData);
  });
});
