import { describe, expect, it } from 'vitest';
import { CATEGORIES, computeTotal } from './categories';

describe('computeTotal', () => {
  it('returns 0 when all scores are missing', () => {
    expect(computeTotal({})).toBe(0);
  });

  it('returns 10 when all category scores are 10', () => {
    const scores: any = {};
    for (const c of CATEGORIES) scores[c.key] = 10;
    expect(computeTotal(scores)).toBeCloseTo(10, 8);
  });

  it('is a weighted average within [0,10]', () => {
    const scores: any = {};
    for (const c of CATEGORIES) scores[c.key] = c.weight * 10;
    const t = computeTotal(scores);
    expect(t).toBeGreaterThanOrEqual(0);
    expect(t).toBeLessThanOrEqual(10);
  });
});

