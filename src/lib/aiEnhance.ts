import type { CategoryKey } from './categories';
import type { GitHubRepoData } from './github';

export type AiEnhancement = {
  adjustments: Partial<Record<CategoryKey, number>>;
  summary: string;
  topStrength: string;
  topWeakness: string;
  recommendations: string[];
  redFlags: string[];
};

function extractFirstJsonObject(text: string): unknown {
  const cleaned = text.replace(/```json\s?|```/g, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object in model response');
  return JSON.parse(cleaned.slice(start, end + 1));
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === 'object' && !Array.isArray(v);
}

function sanitizeModelId(model: string): string {
  // Workers AI catalog uses @cf/... and @hf/... prefixes. Keep it conservative.
  const m = model.trim();
  if (!m.startsWith('@cf/') && !m.startsWith('@hf/')) throw new Error('Invalid model id');
  if (m.length > 120) throw new Error('Invalid model id');
  return m;
}

export async function aiEnhance(
  env: { AI?: Ai },
  data: GitHubRepoData,
  deterministicScores: Record<CategoryKey, number>,
  model: string,
): Promise<AiEnhancement | null> {
  if (!env.AI) return null;

  let modelId: string;
  try {
    modelId = sanitizeModelId(model);
  } catch {
    modelId = '@cf/zai-org/glm-4.7-flash';
  }

  const schema = {
    adjustments: {
      firstImpressions: 0,
      readme: 0,
      documentation: 0,
      codeQuality: 0,
      testing: 0,
      cicd: 0,
      security: 0,
      community: 0,
      maintenance: 0,
      dx: 0,
      licensing: 0,
    },
    summary: 'One paragraph.',
    topStrength: 'Best thing.',
    topWeakness: 'Biggest gap.',
    recommendations: ['rec1', 'rec2', 'rec3'],
    redFlags: [],
  };

  const prompt =
    'You score open-source repos. Return ONLY valid JSON. No markdown.\n' +
    `${JSON.stringify(schema)}\n\n` +
    'Each adjustment: float -2 to +2.\n' +
    `Scores: ${JSON.stringify(deterministicScores)}\n` +
    `Repo: ${data.meta.full_name}\n` +
    `Desc: ${data.meta.description || 'none'}\n` +
    `Stars: ${data.meta.stargazers_count} Lang: ${data.meta.language}\n` +
    `Topics: ${((data.meta.topics || []) as string[]).join(', ') || 'none'}\n` +
    `Homepage: ${data.meta.homepage || 'none'}\n\n` +
    `README:\n${String(data.readme || '').slice(0, 4000)}\n\n` +
    `Files:\n${(data.allPaths || []).slice(0, 120).join('\n')}`;

  try {
    const res = (await env.AI.run(modelId, {
      messages: [{ role: 'user', content: prompt }],
    })) as any;

    const text = typeof res === 'string' ? res : res?.response ?? res?.result ?? JSON.stringify(res);
    const parsed = extractFirstJsonObject(String(text));
    if (!isRecord(parsed)) return null;

    const adj = (parsed.adjustments as any) ?? {};
    if (!isRecord(adj)) return null;

    const enhancement: AiEnhancement = {
      adjustments: adj as AiEnhancement['adjustments'],
      summary: String((parsed as any).summary || ''),
      topStrength: String((parsed as any).topStrength || ''),
      topWeakness: String((parsed as any).topWeakness || ''),
      recommendations: Array.isArray((parsed as any).recommendations) ? (parsed as any).recommendations.map(String) : [],
      redFlags: Array.isArray((parsed as any).redFlags) ? (parsed as any).redFlags.map(String) : [],
    };

    return enhancement;
  } catch {
    return null;
  }
}
