import type { CategoryKey } from './categories';

export type RepoMeta = {
  full_name: string;
  description: string | null;
  stars: number | null;
  forks: number | null;
  open_issues: number | null;
  language: string | null;
  license: string | null;
  homepage: string | null;
  created_year: number | null;
  archived: boolean;
};

export type AuditResult = {
  meta: RepoMeta;
  scores: Record<CategoryKey, number>;
  details: Record<CategoryKey, string[]>;
  summary: string | null;
  topStrength: string | null;
  topWeakness: string | null;
  recommendations: string[];
  redFlags: string[];
  modelUsed: string | null;
};

