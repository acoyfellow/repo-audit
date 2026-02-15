import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchGitHubData } from './github';

type MockResponse = {
  status?: number;
  ok?: boolean;
  json?: any;
};

function b64(s: string) {
  return Buffer.from(s, 'utf8').toString('base64');
}

describe('fetchGitHubData', () => {
  const fetchMock = vi.fn();

  afterEach(() => {
    fetchMock.mockReset();
    // @ts-expect-error test cleanup
    globalThis.fetch = undefined;
  });

  it('decodes README and returns lowercased paths', async () => {
    // @ts-expect-error test mock
    globalThis.fetch = fetchMock;

    const owner = 'o';
    const repo = 'r';
    const base = `https://api.github.com/repos/${owner}/${repo}`;

    const routes: Record<string, MockResponse> = {
      [base]: {
        status: 200,
        ok: true,
        json: {
          full_name: `${owner}/${repo}`,
          default_branch: 'main',
        },
      },
      [`${base}/community/profile`]: { status: 200, ok: true, json: { files: {} } },
      [`${base}/readme`]: { status: 200, ok: true, json: { content: `${b64('Hello README')}\n` } },
      [`${base}/contents/`]: { status: 200, ok: true, json: [{ name: 'README.md' }, { name: 'Src' }] },
      [`${base}/releases?per_page=10`]: { status: 200, ok: true, json: [] },
      [`${base}/actions/workflows`]: { status: 200, ok: true, json: { workflows: [] } },
      [`${base}/contributors?per_page=30`]: { status: 200, ok: true, json: [] },
      [`${base}/commits?per_page=30`]: { status: 200, ok: true, json: [] },
      [`${base}/git/trees/main?recursive=1`]: {
        status: 200,
        ok: true,
        json: { tree: [{ path: 'SRC/Index.ts' }, { path: 'Docs/Guide.MD' }] },
      },
    };

    fetchMock.mockImplementation(async (url: string) => {
      const r = routes[String(url)];
      if (!r) {
        return new Response('not found', { status: 404 });
      }
      return new Response(JSON.stringify(r.json ?? {}), {
        status: r.status ?? 200,
        headers: { 'content-type': 'application/json' },
      });
    });

    const data = await fetchGitHubData(owner, repo);
    expect(data.readme).toContain('Hello README');
    expect(data.rootFiles).toEqual(['readme.md', 'src']);
    expect(data.allPaths).toEqual(['src/index.ts', 'docs/guide.md']);
  });
});

