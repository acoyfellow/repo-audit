import { describe, expect, it } from 'vitest';
import { rateLimitFixedWindow } from './rateLimit';

function mkKv() {
  const m = new Map<string, string>();
  return {
    get: async (k: string) => m.get(k) ?? null,
    put: async (k: string, v: string) => {
      m.set(k, v);
    },
  };
}

describe('rateLimitFixedWindow', () => {
  it('allows up to the limit and then blocks', async () => {
    const kv = mkKv();
    const nowMs = Date.parse('2026-02-14T00:00:10Z');

    const r1 = await rateLimitFixedWindow({ kv, key: 'ip', limit: 2, windowSeconds: 60, nowMs });
    const r2 = await rateLimitFixedWindow({ kv, key: 'ip', limit: 2, windowSeconds: 60, nowMs });
    const r3 = await rateLimitFixedWindow({ kv, key: 'ip', limit: 2, windowSeconds: 60, nowMs });

    expect(r1.ok).toBe(true);
    expect(r2.ok).toBe(true);
    expect(r3.ok).toBe(false);
    expect(r3.retryAfterSeconds).toBeGreaterThan(0);
  });
});

