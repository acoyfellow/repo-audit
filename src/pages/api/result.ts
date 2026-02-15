import type { APIRoute } from 'astro';
import { rateLimitFixedWindow } from '../../lib/rateLimit';
import { kvGetJson } from '../../lib/kvJson';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get('id')?.trim() || '';

  const env = (locals as any)?.runtime?.env as { RATE_LIMIT?: KVNamespace; RESULTS?: KVNamespace } | undefined;
  const rateKv = env?.RATE_LIMIT;
  const resultsKv = env?.RESULTS;

  if (!id) {
    return new Response(JSON.stringify({ error: 'Pass ?id=...' }), {
      status: 400,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

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
      key: `${ip}:/api/result`,
      limit: 60,
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

  const stored = await kvGetJson<any>(resultsKv, `share:${id}`);
  if (!stored) {
    return new Response(JSON.stringify({ error: 'Not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  return new Response(JSON.stringify(stored), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

