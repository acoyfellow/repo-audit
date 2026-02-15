export type CategoryKey =
  | 'firstImpressions'
  | 'readme'
  | 'documentation'
  | 'codeQuality'
  | 'testing'
  | 'cicd'
  | 'security'
  | 'community'
  | 'maintenance'
  | 'dx'
  | 'licensing';

export type CategoryDef = {
  key: CategoryKey;
  name: string;
  icon: string;
  weight: number;
};

// Weights sum to 1.00.
export const CATEGORIES: CategoryDef[] = [
  { key: 'firstImpressions', name: 'First Impressions', icon: '◆', weight: 0.07 },
  { key: 'readme', name: 'README Quality', icon: '◈', weight: 0.11 },
  { key: 'documentation', name: 'Documentation', icon: '▣', weight: 0.11 },
  { key: 'codeQuality', name: 'Code Quality', icon: '⬡', weight: 0.14 },
  { key: 'testing', name: 'Testing', icon: '◎', weight: 0.09 },
  { key: 'cicd', name: 'CI/CD', icon: '◉', weight: 0.07 },
  { key: 'security', name: 'Security', icon: '◇', weight: 0.09 },
  { key: 'community', name: 'Community', icon: '⬢', weight: 0.09 },
  { key: 'maintenance', name: 'Project Health', icon: '○', weight: 0.09 },
  { key: 'dx', name: 'Dev Experience', icon: '▨', weight: 0.09 },
  { key: 'licensing', name: 'Licensing', icon: '§', weight: 0.05 },
];

export function computeTotal(scores: Partial<Record<CategoryKey, number>>): number {
  const denom = CATEGORIES.reduce((a, c) => a + c.weight, 0);
  const num = CATEGORIES.reduce((a, c) => a + (Number(scores[c.key]) || 0) * c.weight, 0);
  return denom ? num / denom : 0;
}

