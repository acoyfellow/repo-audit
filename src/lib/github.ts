type GitHubFetchOpts = {
  token?: string;
};

export class GitHubApiError extends Error {
  status: number;
  retryAfterSeconds?: number;

  constructor(message: string, status: number, retryAfterSeconds?: number) {
    super(message);
    this.name = 'GitHubApiError';
    this.status = status;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function ghHeaders(opts: GitHubFetchOpts): HeadersInit {
  const h: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'repo-audit',
  };
  if (opts.token) h.Authorization = `Bearer ${opts.token}`;
  return h;
}

async function ghFetchJson<T>(url: string, opts: GitHubFetchOpts): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: ghHeaders(opts) });
  } catch {
    throw new GitHubApiError('Network error fetching GitHub API', 502);
  }
  if (res.status === 404) throw new GitHubApiError('Repository not found. Make sure it exists and is public.', 404);
  if (res.status === 403) {
    const remaining = res.headers.get('x-ratelimit-remaining');
    const reset = res.headers.get('x-ratelimit-reset');
    const body = (await res.text()) || '';
    const isRateLimit = remaining === '0' || /rate limit/i.test(body);
    if (isRateLimit) {
      const resetEpoch = reset ? Number.parseInt(reset, 10) : NaN;
      const retryAfterSeconds =
        Number.isFinite(resetEpoch) && resetEpoch > 0 ? Math.max(0, Math.ceil(resetEpoch - Date.now() / 1000)) : undefined;
      throw new GitHubApiError('GitHub API rate limit exceeded. Try again later or use a token.', 429, retryAfterSeconds);
    }
    throw new GitHubApiError('GitHub API forbidden.', 403);
  }
  if (!res.ok) throw new GitHubApiError(`GitHub API error: ${res.status}`, res.status);
  return (await res.json()) as T;
}

function base64ToUtf8(b64: string): string {
  const clean = b64.replace(/\s/g, '');
  const bin = atob(clean);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder().decode(bytes);
}

export type GitHubRepoData = {
  meta: any;
  community: any | null;
  readme: string;
  rootFiles: string[];
  allPaths: string[];
  releases: any[];
  workflows: any[];
  contributors: any[];
  commits: any[];
};

async function fetchTreeAllPaths(owner: string, repo: string, defaultBranch: string, opts: GitHubFetchOpts): Promise<string[] | null> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  // Fast path: GitHub accepts branch names in many cases.
  try {
    const tree = await ghFetchJson<any>(`${base}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`, opts);
    if (tree?.tree) return tree.tree.map((t: any) => String(t.path || '').toLowerCase());
  } catch {
    // fall through
  }

  // More correct path: ref -> commit -> tree
  try {
    const ref = await ghFetchJson<any>(`${base}/git/refs/heads/${encodeURIComponent(defaultBranch)}`, opts);
    const commitSha = ref?.object?.sha;
    if (!commitSha) return null;

    const commit = await ghFetchJson<any>(`${base}/git/commits/${encodeURIComponent(commitSha)}`, opts);
    const treeSha = commit?.tree?.sha;
    if (!treeSha) return null;

    const tree = await ghFetchJson<any>(`${base}/git/trees/${encodeURIComponent(treeSha)}?recursive=1`, opts);
    if (tree?.tree) return tree.tree.map((t: any) => String(t.path || '').toLowerCase());
  } catch {
    return null;
  }

  return null;
}

export async function fetchGitHubData(owner: string, repo: string, opts: GitHubFetchOpts = {}): Promise<GitHubRepoData> {
  const base = `https://api.github.com/repos/${owner}/${repo}`;

  const meta = await ghFetchJson<any>(base, opts);

  const settled = await Promise.allSettled([
    ghFetchJson<any>(`${base}/community/profile`, opts),
    ghFetchJson<any>(`${base}/readme`, opts),
    ghFetchJson<any>(`${base}/contents/`, opts),
    ghFetchJson<any>(`${base}/releases?per_page=10`, opts),
    ghFetchJson<any>(`${base}/actions/workflows`, opts),
    ghFetchJson<any>(`${base}/contributors?per_page=30`, opts),
    ghFetchJson<any>(`${base}/commits?per_page=30`, opts),
  ]);

  const v = <T,>(i: number): T | null => (settled[i].status === 'fulfilled' ? (settled[i].value as T) : null);

  const readmeObj = v<any>(1);
  const readme = readmeObj?.content ? base64ToUtf8(readmeObj.content) : '';

  const rootFiles = (v<any[]>(2) || []).map((f) => String(f?.name || '').toLowerCase());

  const allPaths = (await fetchTreeAllPaths(owner, repo, meta.default_branch, opts)) ?? rootFiles.slice();

  return {
    meta,
    community: v<any>(0),
    readme,
    rootFiles,
    allPaths,
    releases: v<any[]>(3) || [],
    workflows: v<any>(4)?.workflows || [],
    contributors: v<any[]>(5) || [],
    commits: v<any[]>(6) || [],
  };
}
