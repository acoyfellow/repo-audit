import type { APIRoute } from 'astro';
import { rateLimitFixedWindow } from '../../lib/rateLimit';
import { kvPutJson } from '../../lib/kvJson';
import { randomId } from '../../lib/id';
import type { AuditResult } from '../../lib/auditTypes';

export const prerender = false;

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
      limit: 10,
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
  const stored = { ...result, sharedAt: new Date().toISOString() };
  await kvPutJson(resultsKv, key, stored, { expirationTtl: 60 * 60 * 24 * 30 }); // 30 days

  const shareUrl = `${new URL(request.url).origin}/r/${id}`;
  return new Response(JSON.stringify({ id, url: shareUrl }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

