import { describe, expect, it } from 'vitest';

class MemoryKV {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string) {
    this.store.set(key, value);
  }
}

describe('/api/gallery', () => {
  it('returns items from gallery:latest', async () => {
    const kv = new MemoryKV();
    kv.store.set(
      'gallery:latest',
      JSON.stringify({
        items: [
          { id: 'abc', url: 'https://x/r/abc', full_name: 'a/b', total: 7.1, grade: 'A', sharedAt: '2026-02-14T00:00:00Z', modelUsed: null },
          { id: 'def', url: 'https://x/r/def', full_name: 'c/d', total: 5.6, grade: 'B', sharedAt: '2026-02-13T00:00:00Z', modelUsed: null },
        ],
      }),
    );

    const { GET } = await import('../pages/api/gallery');
    const res = await GET({
      request: new Request('http://example.test/api/gallery?limit=1'),
      locals: { runtime: { env: { RESULTS: kv } } },
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(Array.isArray(body.items)).toBe(true);
    expect(body.items.length).toBe(1);
    expect(body.items[0].id).toBe('abc');
  });
});

