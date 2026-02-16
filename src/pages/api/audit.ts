import type { APIRoute } from 'astro';
import { fetchGitHubData, GitHubApiError } from '../../lib/github';
import { scoreRepo } from '../../lib/scoreRepo';
import { aiEnhance } from '../../lib/aiEnhance';
import { CATEGORIES } from '../../lib/categories';
import type { AuditResult, RepoMeta } from '../../lib/auditTypes';
import { buildFileTree } from '../../lib/fileTree';
import { rateLimitFixedWindow } from '../../lib/rateLimit';
import { kvGetJson, kvPutJson } from '../../lib/kvJson';

export const prerender = false;

function clamp01to10(n: number): number {
  return Math.max(0, Math.min(10, n));
}

export const GET: APIRoute = async ({ request, locals }) => {
  try {
    const url = new URL(request.url);
    const repo = url.searchParams.get('repo')?.trim() || '';
    const model = url.searchParams.get('model')?.trim() || '@cf/zai-org/glm-4.7-flash';
    const ai = url.searchParams.get('ai');
    const aiEnabled = ai !== '0';
    const fresh = url.searchParams.get('fresh') === '1';

    const m = repo.replace(/\/$/, '').match(/^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/);
    if (!m) {
      return new Response(JSON.stringify({ error: 'Pass ?repo=owner/name' }), {
        status: 400,
        headers: { 'content-type': 'application/json; charset=utf-8' },
      });
    }

    const owner = m[1]!;
    const name = m[2]!;

    const env = (locals as any)?.runtime?.env as {
      AI?: Ai;
      GITHUB_TOKEN?: string;
      RATE_LIMIT?: KVNamespace;
      RESULTS?: KVNamespace;
    } | undefined;

    // Prefer a server-side secret. Optionally accept a caller-provided token as an escape hatch
    // for GitHub API rate limits (never store it).
    const ghToken =
      env?.GITHUB_TOKEN ||
      (globalThis as any)?.process?.env?.GITHUB_TOKEN ||
      request.headers.get('x-github-token')?.trim() ||
      undefined;

    // Cheap abuse protection (KV-based). Intended to cap costs (GitHub + AI), not perfect security.
    const ip =
      request.headers.get('cf-connecting-ip') ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      'unknown';

    const kv = env?.RATE_LIMIT;
    if (kv) {
      const rl = await rateLimitFixedWindow({
        kv,
        key: `${ip}:/api/audit:${aiEnabled ? 'ai' : 'det'}`,
        limit: aiEnabled ? 6 : 30, // per minute, per IP
        windowSeconds: 60,
      });
      if (!rl.ok) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Try again soon.' }), {
          status: 429,
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'retry-after': String(rl.retryAfterSeconds),
            'x-ratelimit-limit': String(rl.limit),
            'x-ratelimit-remaining': String(rl.remaining),
          },
        });
      }
    }

    const resultsKv = env?.RESULTS;
    const repoKey = `${owner.toLowerCase()}/${name.toLowerCase()}`;
    const modelKey = aiEnabled ? model.trim() : 'none';
    const cacheKey = `cache:${repoKey}:ai=${aiEnabled ? 1 : 0}:model=${modelKey}`;
    // Deterministic scoring is fairly stable; keep it longer to reduce GitHub load.
    const cacheTtlSeconds = aiEnabled ? 600 : 3600;

    if (resultsKv && !fresh) {
      const cached = await kvGetJson<AuditResult>(resultsKv, cacheKey);
      if (cached) {
        return new Response(JSON.stringify(cached), {
          headers: {
            'content-type': 'application/json; charset=utf-8',
            'cache-control': aiEnabled ? 'public, max-age=60' : 'public, max-age=300',
            'x-repo-audit-cache': 'hit',
          },
        });
      }
    }

    const data = await fetchGitHubData(owner, name, { token: ghToken });
    const det = scoreRepo(data);
    const fileTree = buildFileTree(data.allPaths);

    const enhancement = !aiEnabled ? null : await aiEnhance(env ?? {}, data, det.scores, model);

    const finalScores: any = { ...det.scores };
    if (enhancement?.adjustments) {
      for (const [k, v] of Object.entries(enhancement.adjustments)) {
        if (typeof v !== 'number') continue;
        if (finalScores[k] == null) continue;
        finalScores[k] = clamp01to10(Number(finalScores[k]) + v);
      }
    }

    const meta: RepoMeta = {
      full_name: data.meta.full_name,
      description: data.meta.description ?? null,
      stars: data.meta.stargazers_count ?? null,
      forks: data.meta.forks_count ?? null,
      open_issues: data.meta.open_issues_count ?? null,
      language: data.meta.language ?? null,
      license: data.meta.license ? data.meta.license.spdx_id : null,
      homepage: data.meta.homepage ?? null,
      created_year: data.meta.created_at ? new Date(data.meta.created_at).getFullYear() : null,
      archived: !!data.meta.archived,
    };

    // Ensure all category keys exist even if scoring changes.
    for (const c of CATEGORIES) {
      if (finalScores[c.key] == null) finalScores[c.key] = 0;
      if (det.details[c.key] == null) (det.details as any)[c.key] = [];
    }

    const result: AuditResult = {
      meta,
      scores: finalScores,
      details: det.details,
      summary: enhancement?.summary || null,
      topStrength: enhancement?.topStrength || null,
      topWeakness: enhancement?.topWeakness || null,
      recommendations: enhancement?.recommendations || [],
      redFlags: enhancement?.redFlags || [],
      modelUsed: enhancement ? model : null,
      fileTree,
    };

    if (resultsKv) {
      await kvPutJson(resultsKv, cacheKey, result, { expirationTtl: cacheTtlSeconds });
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        // Cache briefly to reduce GitHub + AI load.
        'cache-control': aiEnabled ? 'public, max-age=60' : 'public, max-age=300',
        'x-repo-audit-cache': 'miss',
      },
    });
  } catch (e: any) {
    const status = typeof e?.status === 'number' ? e.status : 500;
    const headers: Record<string, string> = { 'content-type': 'application/json; charset=utf-8' };
    if (e instanceof GitHubApiError && status === 429 && typeof e.retryAfterSeconds === 'number') {
      headers['retry-after'] = String(e.retryAfterSeconds);
    }
    return new Response(JSON.stringify({ error: e?.message || 'Internal error' }), { status, headers });
  }
};
