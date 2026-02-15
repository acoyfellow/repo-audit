import type { APIRoute } from 'astro';
import { rateLimitFixedWindow } from '../../lib/rateLimit';
import { kvGetJson, kvPutJson } from '../../lib/kvJson';
import { randomId } from '../../lib/id';
import type { AuditResult } from '../../lib/auditTypes';
import { computeTotal } from '../../lib/categories';
import { getGrade } from '../../lib/grades';

export const prerender = false;

type GalleryItem = {
  id: string;
  url: string;
  full_name: string;
  total: number;
  grade: string;
  sharedAt: string;
  modelUsed: string | null;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function looksLikeAuditResult(v: unknown): v is AuditResult {
  if (!isRecord(v)) return false;
  const meta = (v as any).meta;
  const scores = (v as any).scores;
  const details = (v as any).details;
  if (!isRecord(meta) || typeof meta.full_name !== 'string') return false;
  if (!isRecord(scores) || !isRecord(details)) return false;
  return true;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any)?.runtime?.env as { RATE_LIMIT?: KVNamespace; RESULTS?: KVNamespace } | undefined;
  const rateKv = env?.RATE_LIMIT;
  const resultsKv = env?.RESULTS;

  if (!resultsKv) {
    return new Response(JSON.stringify({ error: 'Storage not configured' }), {
      status: 501,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const ip =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';

  if (rateKv) {
    const rl = await rateLimitFixedWindow({
      kv: rateKv,
      key: `${ip}:/api/share`,
      // Share is called by the UI by default after an audit; keep it in the same ballpark
      // as `/api/audit` so we don't rate-limit legitimate usage.
      limit: 30,
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

  const len = request.headers.get('content-length');
  if (len && Number(len) > 250_000) {
    return new Response(JSON.stringify({ error: 'Payload too large' }), {
      status: 413,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const result = body?.result;
  if (!looksLikeAuditResult(result)) {
    return new Response(JSON.stringify({ error: 'Invalid result shape' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const jsonSize = JSON.stringify(result).length;
  if (jsonSize > 220_000) {
    return new Response(JSON.stringify({ error: 'Result too large to share' }), {
      status: 413,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const id = randomId(10);
  const key = `share:${id}`;
  const sharedAt = new Date().toISOString();
  const stored = { ...result, sharedAt };
  await kvPutJson(resultsKv, key, stored, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days

  const shareUrl = `${new URL(request.url).origin}/r/${id}`;

  // Best-effort gallery index.
  try {
    const galleryKey = 'gallery:latest';
    const existing = (await kvGetJson<{ items?: GalleryItem[] }>(resultsKv, galleryKey))?.items ?? [];
    const total = Number(computeTotal((result as any).scores ?? {}));
    const grade = getGrade(total);
    const item: GalleryItem = {
      id,
      url: shareUrl,
      full_name: String((result as any).meta?.full_name || ''),
      total: Number.isFinite(total) ? total : 0,
      grade: grade.letter,
      sharedAt,
      modelUsed: (result as any).modelUsed ?? null,
    };

    const now = Date.now();
    const maxAgeMs = 30 * 24 * 60 * 60 * 1000;
    const pruned = existing
      .filter((x) => x && x.id && x.id !== id)
      .filter((x) => {
        const t = Date.parse(String((x as any).sharedAt || ''));
        return Number.isFinite(t) ? now - t < maxAgeMs : true;
      })
      .slice(0, 49);

    await kvPutJson(resultsKv, galleryKey, { items: [item, ...pruned] });
  } catch {
    // Ignore gallery failures; sharing must still succeed.
  }

  return new Response(JSON.stringify({ id, url: shareUrl }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};
