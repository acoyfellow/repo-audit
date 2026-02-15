import type { APIRoute } from 'astro';
import { kvGetJson, kvPutJson } from '../../lib/kvJson';

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

/**
 * POST /api/gallery — one-time cleanup: deduplicate gallery entries by full_name,
 * keeping only the most recent entry per repo.
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const env = (locals as any)?.runtime?.env as { RESULTS?: KVNamespace } | undefined;
  const resultsKv = env?.RESULTS;

  if (!resultsKv) {
    return new Response(JSON.stringify({ error: 'Storage not configured' }), {
      status: 501,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const gallery = (await kvGetJson<{ items?: GalleryItem[] }>(resultsKv, 'gallery:latest'))?.items ?? [];
  const before = gallery.length;

  // Keep only the first (most recent) entry per repo name
  const seen = new Set<string>();
  const deduped: GalleryItem[] = [];
  for (const item of gallery) {
    const key = item.full_name.trim().toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(item);
  }

  await kvPutJson(resultsKv, 'gallery:latest', { items: deduped });

  return new Response(JSON.stringify({ before, after: deduped.length, removed: before - deduped.length }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
};

export const GET: APIRoute = async ({ request, locals }) => {
  const url = new URL(request.url);
  const limitRaw = url.searchParams.get('limit');
  const limit = Math.max(1, Math.min(24, Number(limitRaw || '8') || 8));

  const env = (locals as any)?.runtime?.env as { RESULTS?: KVNamespace } | undefined;
  const resultsKv = env?.RESULTS;

  if (!resultsKv) {
    return new Response(JSON.stringify({ error: 'Storage not configured' }), {
      status: 501,
      headers: { 'content-type': 'application/json; charset=utf-8' },
    });
  }

  const gallery = (await kvGetJson<{ items?: GalleryItem[] }>(resultsKv, 'gallery:latest'))?.items ?? [];
  const items = Array.isArray(gallery) ? gallery.slice(0, limit) : [];

  return new Response(JSON.stringify({ items }), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'public, max-age=30',
    },
  });
};

