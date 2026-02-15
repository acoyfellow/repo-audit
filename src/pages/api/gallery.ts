import type { APIRoute } from 'astro';
import { kvGetJson } from '../../lib/kvJson';

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

