import type { APIRoute } from 'astro';
import { Resvg } from '@cf-wasm/resvg';

export const prerender = false;

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxChars && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

type GradeInfo = { letter: string; color: string; label: string };

function getGradeInfo(score: number): GradeInfo {
  if (score >= 8.5) return { letter: 'S', color: '#00d4aa', label: 'Exceptional' };
  if (score >= 7.0) return { letter: 'A', color: '#4488ff', label: 'Production-Ready' };
  if (score >= 5.5) return { letter: 'B', color: '#e8c547', label: 'Solid Foundation' };
  if (score >= 4.0) return { letter: 'C', color: '#ff8844', label: 'Needs Work' };
  if (score >= 2.0) return { letter: 'D', color: '#ff4466', label: 'Significant Gaps' };
  return { letter: 'F', color: '#ff2244', label: 'Critical Issues' };
}

function buildSvg(params: {
  title?: string;
  repo?: string;
  score?: number;
  grade?: GradeInfo;
  description?: string;
}): string {
  const { title, repo, score, grade, description } = params;
  const W = 1200;
  const H = 630;

  // Default homepage OG
  if (!repo) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08080a"/>
      <stop offset="100%" stop-color="#0f0f14"/>
    </linearGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#00d4aa"/>
      <stop offset="100%" stop-color="#00b894"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="url(#accent)"/>
  <text x="80" y="200" fill="#4a4a55" font-family="monospace" font-size="14" letter-spacing="4">OPEN-SOURCE SCORING</text>
  <text x="80" y="290" fill="#e4e4ea" font-family="Georgia, serif" font-size="72">Repository</text>
  <text x="530" y="290" fill="#00d4aa" font-family="Georgia, serif" font-size="72" font-style="italic" font-weight="bold">Audit</text>
  <text x="80" y="350" fill="#7a7a88" font-family="sans-serif" font-size="22">Deterministic scoring plus an optional Workers AI qualitative pass.</text>
  <text x="80" y="385" fill="#7a7a88" font-family="sans-serif" font-size="22">Designed for fast, opinionated repo triage.</text>
  <text x="80" y="${H - 50}" fill="#4a4a55" font-family="monospace" font-size="16">repo-audit.coey.dev</text>
</svg>`;
  }

  // Per-repo OG
  const g = grade ?? getGradeInfo(score ?? 0);
  const s = score ?? 0;
  const descLines = description ? wrapText(description, 55) : [];

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#08080a"/>
      <stop offset="100%" stop-color="#0f0f14"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect x="0" y="${H - 4}" width="${W}" height="4" fill="${g.color}"/>

  <!-- Grade circle -->
  <circle cx="${W - 160}" cy="200" r="100" fill="none" stroke="${g.color}" stroke-width="6" opacity="0.3"/>
  <circle cx="${W - 160}" cy="200" r="100" fill="none" stroke="${g.color}" stroke-width="6"
    stroke-dasharray="${(s / 10) * 628} 628" stroke-linecap="round"
    transform="rotate(-90 ${W - 160} 200)"/>
  <text x="${W - 160}" y="185" fill="${g.color}" font-family="Georgia, serif" font-size="80"
    text-anchor="middle" dominant-baseline="central" font-weight="bold">${escapeXml(g.letter)}</text>
  <text x="${W - 160}" y="250" fill="#7a7a88" font-family="monospace" font-size="22"
    text-anchor="middle">${s.toFixed(1)} / 10</text>

  <!-- Labels -->
  <text x="80" y="80" fill="#4a4a55" font-family="monospace" font-size="14" letter-spacing="4">REPO AUDIT</text>
  <text x="80" y="180" fill="#e4e4ea" font-family="monospace" font-size="48" font-weight="bold">${escapeXml(repo)}</text>
  <text x="80" y="240" fill="${g.color}" font-family="sans-serif" font-size="24">${escapeXml(g.label)}</text>
  ${descLines.slice(0, 2).map((line, i) =>
    `<text x="80" y="${300 + i * 32}" fill="#7a7a88" font-family="sans-serif" font-size="20">${escapeXml(line)}</text>`
  ).join('\n  ')}

  <text x="80" y="${H - 50}" fill="#4a4a55" font-family="monospace" font-size="16">repo-audit.coey.dev</text>
</svg>`;
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url);
  const repo = url.searchParams.get('repo') ?? undefined;
  const scoreRaw = url.searchParams.get('score');
  const score = scoreRaw ? parseFloat(scoreRaw) : undefined;
  const description = url.searchParams.get('desc') ?? undefined;
  const format = url.searchParams.get('format') ?? 'png';

  const grade = score != null ? getGradeInfo(score) : undefined;
  const svg = buildSvg({ repo, score, grade, description });

  if (format === 'svg') {
    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml',
        'cache-control': 'public, max-age=86400',
      },
    });
  }

  // Render SVG to PNG
  try {
    const resvg = new Resvg(svg, {
      fitTo: { mode: 'width' as const, value: 1200 },
    });
    const png = resvg.render().asPng();

    return new Response(png as unknown as ArrayBuffer, {
      headers: {
        'content-type': 'image/png',
        'cache-control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    // Fallback: return SVG if PNG rendering fails
    console.error('resvg PNG render failed:', err);
    return new Response(svg, {
      headers: {
        'content-type': 'image/svg+xml',
        'cache-control': 'public, max-age=3600',
      },
    });
  }
};
