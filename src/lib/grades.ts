export type Grade = {
  letter: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  color: string;
  label: string;
  min: number;
};

const GRADES: Record<Grade['letter'], Grade> = {
  S: { letter: 'S', color: '#00d4aa', label: 'Exceptional', min: 8.5 },
  A: { letter: 'A', color: '#4488ff', label: 'Production-Ready', min: 7.0 },
  B: { letter: 'B', color: '#e8c547', label: 'Solid Foundation', min: 5.5 },
  C: { letter: 'C', color: '#ff8844', label: 'Needs Work', min: 4.0 },
  D: { letter: 'D', color: '#ff4466', label: 'Significant Gaps', min: 2.0 },
  F: { letter: 'F', color: '#ff2244', label: 'Critical Issues', min: 0 },
};

export function getGrade(score: number): Grade {
  for (const g of Object.values(GRADES)) {
    if (score >= g.min) return g;
  }
  return GRADES.F;
}

