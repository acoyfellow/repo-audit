import { describe, expect, it } from 'vitest';
import { getGrade } from './grades';

describe('getGrade', () => {
  it('maps boundaries correctly', () => {
    expect(getGrade(9.1).letter).toBe('S');
    expect(getGrade(8.5).letter).toBe('S');
    expect(getGrade(8.49).letter).toBe('A');
    expect(getGrade(7.0).letter).toBe('A');
    expect(getGrade(6.99).letter).toBe('B');
    expect(getGrade(5.5).letter).toBe('B');
    expect(getGrade(4.0).letter).toBe('C');
    expect(getGrade(2.0).letter).toBe('D');
    expect(getGrade(0).letter).toBe('F');
  });
});

