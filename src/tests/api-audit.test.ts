import { describe, expect, it, vi } from 'vitest';

class MemoryKV {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

const fetchGitHubDataMock = vi.fn(async () => {
  throw new Error('fetchGitHubData should not be called on cache hit');
});
const scoreRepoMock = vi.fn(() => {
  throw new Error('scoreRepo should not be called on cache hit');
});
const aiEnhanceMock = vi.fn(async () => {
  throw new Error('aiEnhance should not be called on cache hit');
});

class GitHubApiError extends Error {
  status: number;
  retryAfterSeconds?: number;
  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

vi.mock('../lib/github', () => {
  return {
    fetchGitHubData: fetchGitHubDataMock,
    GitHubApiError,
  };
});
vi.mock('../lib/scoreRepo', () => {
  return {
    scoreRepo: scoreRepoMock,
  };
});
vi.mock('../lib/aiEnhance', () => {
  return {
    aiEnhance: aiEnhanceMock,
  };
});

describe('/api/audit', () => {
  it('returns cached result from RESULTS KV (hit) without calling GitHub/AI', async () => {
    const resultsKv = new MemoryKV();
    const cached = {
      meta: { full_name: 'sveltejs/svelte' },
      scores: { foo: 1 },
      details: { foo: [] },
      summary: null,
      topStrength: null,
      topWeakness: null,
      recommendations: [],
      redFlags: [],
      modelUsed: null,
    };
    resultsKv.store.set('cache:sveltejs/svelte:ai=0:model=none', JSON.stringify(cached));

    const { GET } = await import('../pages/api/audit');
    const res = await GET({
      request: new Request('http://example.test/api/audit?repo=sveltejs/svelte&ai=0'),
      locals: { runtime: { env: { RESULTS: resultsKv } } },
    } as any);

    expect(res.status).toBe(200);
    expect(res.headers.get('x-repo-audit-cache')).toBe('hit');
    const body = await res.json();
    expect(body?.meta?.full_name).toBe('sveltejs/svelte');
  });

  it('forwards x-github-token to fetchGitHubData (no cache)', async () => {
    fetchGitHubDataMock.mockImplementation(async (_owner: string, _repo: string, opts: any) => {
      expect(opts?.token).toBe('token123');
      return {
        meta: {
          full_name: 'example/repo',
          description: null,
          stargazers_count: 1,
          forks_count: 1,
          open_issues_count: 0,
          language: 'TypeScript',
          license: { spdx_id: 'MIT' },
          homepage: null,
          created_at: '2020-01-01T00:00:00Z',
          archived: false,
          default_branch: 'main',
        },
        community: null,
        readme: '',
        rootFiles: [],
        allPaths: [],
        releases: [],
        workflows: [],
        contributors: [],
        commits: [],
      };
    });

    scoreRepoMock.mockImplementation(() => ({
      scores: { firstImpressions: 7 },
      details: { firstImpressions: ['Has description'] },
    }));

    const { GET } = await import('../pages/api/audit');
    const res = await GET({
      request: new Request('http://example.test/api/audit?repo=example/repo&ai=0', {
        headers: { 'x-github-token': 'token123' },
      }),
      locals: { runtime: { env: {} } },
    } as any);

    const debugBody = await res.clone().text();
    expect(res.status, debugBody).toBe(200);
    const body = await res.json();
    expect(body?.meta?.full_name).toBe('example/repo');
  });
});
