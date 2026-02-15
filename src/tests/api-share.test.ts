import { webcrypto } from 'node:crypto';
import { describe, expect, it } from 'vitest';

if (!(globalThis as any).crypto) (globalThis as any).crypto = webcrypto as any;

class MemoryKV {
  store = new Map<string, string>();
  puts: Array<{ key: string; value: string; opts?: any }> = [];
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async put(key: string, value: string, opts?: any) {
    this.store.set(key, value);
    this.puts.push({ key, value, opts });
  }
}

describe('/api/share', () => {
  it('stores the result in KV and returns a share URL', async () => {
    const resultsKv = new MemoryKV();
    const { POST } = await import('../pages/api/share');

    const result = {
      meta: { full_name: 'acme/widgets' },
      scores: { readme: 7.5 },
      details: { readme: ['Has examples'] },
      summary: null,
      topStrength: null,
      topWeakness: null,
      recommendations: [],
      redFlags: [],
      modelUsed: null,
    };

    const res = await POST({
      request: new Request('http://example.test/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result }),
      }),
      locals: { runtime: { env: { RESULTS: resultsKv } } },
    } as any);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(typeof body.id).toBe('string');
    expect(body.id.length).toBeGreaterThanOrEqual(6);
    expect(String(body.url)).toContain(`/r/${body.id}`);

    const put = resultsKv.puts[0];
    expect(put).toBeTruthy();
    expect(put!.key).toBe(`share:${body.id}`);
    expect(put!.opts?.expirationTtl).toBe(60 * 60 * 24 * 30);

    const stored = JSON.parse(resultsKv.store.get(`share:${body.id}`)!);
    expect(stored.meta.full_name).toBe('acme/widgets');
    expect(typeof stored.sharedAt).toBe('string');

    const gallery = JSON.parse(resultsKv.store.get('gallery:latest')!);
    expect(Array.isArray(gallery.items)).toBe(true);
    expect(gallery.items[0].id).toBe(body.id);
    expect(gallery.items[0].full_name).toBe('acme/widgets');
  });
});
