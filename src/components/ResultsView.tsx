import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, computeTotal } from '../lib/categories';
import { getGrade } from '../lib/grades';
import type { AuditResult } from '../lib/auditTypes';

function isNeg(t: string) {
  return /^(no |missing|stale|few |flat |low |minimal |none|archived|thin|weak|brief |lacks|limited|absent)/i.test((t || '').trim());
}

function AnimNum({ value, dur = 1400 }: { value: number; dur?: number }) {
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  const mounted = useRef(true);
  const [n, setN] = useState(() => (typeof window === 'undefined' ? value : 0));

  useEffect(() => {
    // On the server we render the final number (no animation).
    if (typeof window === 'undefined') return;

    mounted.current = true;
    t0.current = null;
    setN(0);

    const step = (ts: number) => {
      if (!mounted.current) return;
      if (!t0.current) t0.current = ts;
      const p = Math.min((ts - t0.current) / dur, 1);
      setN(value * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf.current = requestAnimationFrame(step);
    };

    raf.current = requestAnimationFrame(step);
    return () => {
      mounted.current = false;
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, [value, dur]);

  return <>{n.toFixed(1)}</>;
}

function Ring({ score, size = 64, sw = 2.5, delay = 0 }: { score: number; size?: number; sw?: number; delay?: number }) {
  // Render "on" for SSR so share pages look correct without hydration.
  const [on, setOn] = useState(() => (typeof window === 'undefined' ? true : false));
  const g = getGrade(score);
  const r = (size - sw * 2) / 2;
  const c = 2 * Math.PI * r;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = setTimeout(() => setOn(true), delay);
    return () => clearTimeout(t);
  }, [delay]);

  return (
    <div className="relative" style={{ width: size, height: size, opacity: on ? 1 : 0, transition: 'opacity .5s' }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgb(var(--c-border))" strokeWidth={sw} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={g.color}
          strokeWidth={sw}
          strokeDasharray={c}
          strokeDashoffset={on ? c - (score / 10) * c : c}
          strokeLinecap="round"
          style={{
            transition: `stroke-dashoffset 1.6s cubic-bezier(.16,1,.3,1) ${delay}ms`,
            filter: `drop-shadow(0 0 6px ${g.color}66)`,
          }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="font-display font-bold" style={{ fontSize: size * 0.3, color: g.color }}>
          {on ? <AnimNum value={score} /> : '0.0'}
        </span>
      </div>
    </div>
  );
}

export default function ResultsView(props: {
  result: AuditResult;
  actions?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const { result, actions, footer } = props;
  const total = useMemo(() => computeTotal(result.scores), [result]);
  const grade = getGrade(total);
  const flags = result.redFlags || [];

  return (
    <div className="animate-fu">
      <div className="rounded-2xl border border-border bg-surface p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[.14em] text-dim">AUDIT COMPLETE</div>
            <a
              className="mt-1 block font-display text-2xl font-medium text-text no-underline hover:text-accent"
              href={`https://github.com/${result.meta.full_name}`}
              target="_blank"
              rel="noreferrer"
            >
              {result.meta.full_name}
            </a>
            {result.modelUsed ? <div className="mt-1 font-mono text-[11px] text-dim">model: {result.modelUsed}</div> : null}
          </div>
          <div className="flex items-center gap-3">
            <Ring score={total} size={60} delay={120} />
            <div className="font-display text-3xl font-bold" style={{ color: grade.color }}>
              {grade.letter}
            </div>
          </div>
        </div>

        {actions ? <div className="mt-4 flex flex-wrap gap-2">{actions}</div> : null}

        {result.summary ? (
          <div className="mt-4 rounded-xl border border-border bg-bg p-4">
            <p className="font-body text-sm leading-relaxed text-text">{result.summary}</p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {result.topStrength ? (
                <div>
                  <div className="font-mono text-[10px] tracking-[.1em] text-accent">STRENGTH</div>
                  <div className="mt-1 font-body text-sm text-muted">{result.topStrength}</div>
                </div>
              ) : null}
              {result.topWeakness ? (
                <div>
                  <div className="font-mono text-[10px] tracking-[.1em] text-warn">WEAKNESS</div>
                  <div className="mt-1 font-body text-sm text-muted">{result.topWeakness}</div>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {flags.length ? (
          <div className="mt-4 rounded-xl border border-bad/25 bg-bad/5 p-3">
            <div className="font-mono text-[10px] tracking-[.1em] text-bad">RED FLAGS</div>
            <div className="mt-2 grid gap-1">
              {flags.map((f, i) => (
                <div key={i} className="font-body text-sm text-bad/90">
                  {f}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="mt-4 grid gap-2">
        {CATEGORIES.map((cat, ci) => {
          const sc = Number(result.scores[cat.key]) || 0;
          const g = getGrade(sc);
          const dd = result.details[cat.key] || [];
          return (
            <div key={cat.key} className="rounded-xl border border-border bg-surface p-4" style={{ animationDelay: `${ci * 40}ms` }}>
              <div className="flex items-center gap-3">
                <span className="w-5 text-center font-mono text-xs" style={{ color: g.color }}>
                  {cat.icon}
                </span>
                <span className="flex-1 font-body text-sm font-semibold text-text">{cat.name}</span>
                <span className="font-mono text-[11px] text-dim">{Math.round(cat.weight * 100)}%</span>
                <span className="min-w-10 text-right font-mono text-sm font-semibold" style={{ color: g.color }}>
                  {sc.toFixed(1)}
                </span>
              </div>
              <div className="ml-8 mt-2 h-0.5 overflow-hidden rounded bg-border">
                <div
                  className="h-full rounded"
                  style={{
                    width: `${sc * 10}%`,
                    background: g.color,
                    transition: 'width .8s cubic-bezier(.16,1,.3,1)',
                    boxShadow: `0 0 10px ${g.color}22`,
                  }}
                />
              </div>
              <div className="ml-8 mt-2 flex flex-wrap gap-x-3 gap-y-1">
                {dd.map((t, i) => {
                  const neg = isNeg(t);
                  return (
                    <span key={i} className="font-mono text-[11px] text-dim">
                      <span className="mr-1" style={{ color: neg ? 'rgb(var(--c-bad) / .7)' : 'rgb(var(--c-accent) / .7)' }}>
                        {neg ? '−' : '+'}
                      </span>
                      {t}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {result.recommendations?.length ? (
        <div className="mt-4 rounded-2xl border border-accent/15 bg-surface p-5">
          <div className="font-mono text-[10px] tracking-[.1em] text-accent">RECOMMENDATIONS</div>
          <div className="mt-3 grid gap-2">
            {result.recommendations.map((r, i) => (
              <div key={i} className="flex gap-3 border-t border-border pt-2 first:border-t-0 first:pt-0">
                <span className="mt-0.5 shrink-0 font-mono text-[11px] text-accent">{String(i + 1).padStart(2, '0')}</span>
                <span className="font-body text-sm leading-relaxed text-muted">{r}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {[
          { l: 'Stars', v: String(result.meta.stars ?? '?') },
          { l: 'Forks', v: String(result.meta.forks ?? '?') },
          { l: 'Issues', v: String(result.meta.open_issues ?? '?') },
          { l: 'Language', v: result.meta.language || 'N/A' },
          { l: 'License', v: result.meta.license || 'None' },
          { l: 'Created', v: result.meta.created_year ? String(result.meta.created_year) : '?' },
        ].map((x) => (
          <div key={x.l} className="rounded-xl border border-border bg-surface p-3">
            <div className="font-mono text-[10px] text-dim">{x.l}</div>
            <div className="mt-1 font-mono text-sm font-semibold text-text">{x.v}</div>
          </div>
        ))}
      </div>

      {footer ? <div className="mt-8 pb-6">{footer}</div> : null}
    </div>
  );
}

