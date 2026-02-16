import { describe, it, expect } from 'vitest';

describe('E2E smoke tests', () => {
  const BASE = process.env.BASE_URL ?? 'https://repo-audit.coey.dev';

  it('homepage returns 200', async () => {
    const res = await fetch(BASE);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/html');
  });

  it('API returns valid audit JSON', async () => {
    const res = await fetch(`${BASE}/api/audit?repo=acoyfellow/repo-audit&ai=0`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('scores');
    expect(json).toHaveProperty('details');
    expect(json).toHaveProperty('meta');
  });

  it('matrix page returns 200', async () => {
    const res = await fetch(`${BASE}/matrix`);
    expect(res.status).toBe(200);
  });

  it('gallery API returns items array', async () => {
    const res = await fetch(`${BASE}/api/gallery?limit=3`);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json).toHaveProperty('items');
    expect(Array.isArray(json.items)).toBe(true);
  });
});
