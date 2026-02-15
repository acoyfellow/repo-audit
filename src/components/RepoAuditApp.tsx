import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { computeTotal } from '../lib/categories';
import { getGrade } from '../lib/grades';
import type { AuditResult } from '../lib/auditTypes';
import ResultsView from './ResultsView';

function AnimNum({ value, dur = 1400 }: { value: number; dur?: number }) {
  const raf = useRef<number | null>(null);
  const t0 = useRef<number | null>(null);
  const mounted = useRef(true);
  const [n, setN] = useState(0);

  useEffect(() => {
    mounted.current = true;
    t0.current = null;

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

const RECOMMENDED_MODELS: Array<{ id: string; label: string; note: string }> = [
  { id: '@cf/zai-org/glm-4.7-flash', label: 'glm-4.7-flash', note: 'Fast default' },
  { id: '@cf/openai/gpt-oss-20b', label: 'gpt-oss-20b', note: 'Balanced quality/cost' },
  { id: '@cf/openai/gpt-oss-120b', label: 'gpt-oss-120b', note: 'Best quality, higher cost' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'llama-3.3-70b fast', note: 'Strong general LLM' },
  { id: '@cf/meta/llama-4-scout-17b-16e-instruct', label: 'llama-4-scout', note: 'Newer, fast' },
  { id: '@cf/meta/llama-4-maverick-17b-128e-instruct-fp8', label: 'llama-4-maverick', note: 'Newer, higher quality' },
];

type Screen = 'input' | 'loading' | 'reveal' | 'results';

function InputCard(props: {
  onSubmit: (repo: string, opts: { ai: boolean; model: string; ghToken?: string }) => void;
  error: string;
  loading: boolean;
  defaultRepo?: string;
}) {
  const { onSubmit, error, loading } = props;
  const [repo, setRepo] = useState(props.defaultRepo ?? '');
  const [localErr, setLocalErr] = useState('');
  const [focused, setFocused] = useState(false);
  const [aiOn, setAiOn] = useState(false);
  const [model, setModel] = useState(RECOMMENDED_MODELS[0]!.id);
  const [customModel, setCustomModel] = useState('');
  const [ghToken, setGhToken] = useState('');

  const ref = useRef<HTMLInputElement | null>(null);
  useEffect(() => {
    const t = setTimeout(() => ref.current?.focus(), 350);
    return () => clearTimeout(t);
  }, []);

  const effectiveModel = (customModel || model).trim();

  const go = () => {
    const raw = repo.trim().replace(/\/$/, '');
    const m = raw.match(/(?:(?:https?:\/\/)?github\.com\/)?([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/);
    if (!m) {
      setLocalErr('Enter owner/repo or a GitHub URL');
      return;
    }
    setLocalErr('');
    onSubmit(`${m[1]}/${m[2]}`.replace(/\.git$/, ''), { ai: aiOn, model: effectiveModel, ghToken: ghToken.trim() || undefined });
  };

  const e = localErr || error;

  return (
    <div className="rounded-2xl border border-border bg-surface p-4 shadow-[0_0_0_1px_rgba(0,0,0,.12)]">
      <div className="relative">
        <input
          ref={ref}
          value={repo}
          onChange={(ev) => {
            setRepo(ev.target.value);
            setLocalErr('');
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(ev) => {
            if (ev.key === 'Enter') go();
          }}
          placeholder="owner/repo or github.com/owner/repo"
          className={[
            'w-full rounded-xl border bg-bg px-4 py-4 pr-28 font-mono text-sm text-text outline-none transition',
            focused ? 'border-accent/40 shadow-glow' : 'border-border',
            loading ? 'opacity-60' : '',
          ].join(' ')}
          disabled={loading}
        />
        <button
          onClick={go}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-accent px-4 py-2 font-mono text-xs font-semibold tracking-wide text-bg transition hover:brightness-95 active:brightness-90 disabled:opacity-50"
          disabled={loading}
        >
          AUDIT
        </button>
      </div>

      {e ? <p className="mt-3 font-body text-sm text-bad">{e}</p> : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl border border-border bg-bg px-3 py-3">
          <span className="font-mono text-xs text-muted">Workers AI pass</span>
          <button
            type="button"
            onClick={() => setAiOn((v) => !v)}
            className={[
              'relative h-6 w-11 rounded-full border transition',
              aiOn ? 'border-accent/50 bg-accent/15' : 'border-border bg-surface',
            ].join(' ')}
          >
            <span
              className={[
                'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition',
                aiOn ? 'left-6 bg-accent' : 'left-1 bg-dim',
              ].join(' ')}
            />
          </button>
        </label>

        <div className="rounded-xl border border-border bg-bg p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted">Model</span>
            <span className="font-mono text-[11px] text-dim">{aiOn ? 'enabled' : 'disabled'}</span>
          </div>
          <select
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-2 font-mono text-xs text-text outline-none disabled:opacity-50"
            value={model}
            onChange={(e2) => setModel(e2.target.value)}
            disabled={!aiOn || loading}
          >
            {RECOMMENDED_MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-2 font-mono text-xs text-text outline-none placeholder:text-dim disabled:opacity-50"
            placeholder="or paste any @cf/... model id"
            value={customModel}
            onChange={(e2) => setCustomModel(e2.target.value)}
            disabled={!aiOn || loading}
          />
          <div className="mt-2 font-mono text-[11px] leading-snug text-dim">
            {RECOMMENDED_MODELS.find((m) => m.id === model)?.note ?? 'Custom model id'}
          </div>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {['sveltejs/svelte', 'astral-sh/ruff', 'cloudflare/workers-sdk'].map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => onSubmit(r, { ai: aiOn, model: effectiveModel, ghToken: ghToken.trim() || undefined })}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[11px] text-dim transition hover:border-accent/40 hover:text-muted disabled:opacity-50"
            disabled={loading}
          >
            {r}
          </button>
        ))}
      </div>

      <details className="mt-5 rounded-xl border border-border bg-bg p-3">
        <summary className="cursor-pointer select-none font-mono text-xs text-muted">Advanced</summary>
        <div className="mt-3">
          <div className="flex items-center justify-between gap-3">
            <span className="font-mono text-xs text-muted">GitHub token (optional)</span>
            <span className="font-mono text-[11px] text-dim">not stored</span>
          </div>
          <input
            className="mt-2 w-full rounded-lg border border-border bg-surface px-2 py-2 font-mono text-xs text-text outline-none placeholder:text-dim disabled:opacity-50"
            placeholder="ghp_... (fine-grained read-only is enough)"
            value={ghToken}
            onChange={(e2) => setGhToken(e2.target.value)}
            disabled={loading}
          />
          <div className="mt-2 font-mono text-[11px] leading-snug text-dim">
            Helps when the public GitHub API rate limit is exhausted.
          </div>
        </div>
      </details>
    </div>
  );
}

function LoadingCard({ name, status }: { name: string; status: string }) {
  const [dots, setDots] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setDots((d) => (d + 1) % 4), 500);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="rounded-2xl border border-border bg-surface p-5">
      <div className="text-center">
        <div className="font-display text-2xl text-text">Analyzing</div>
        <div className="mt-1 font-mono text-sm text-accent">{name}</div>
        <div className="mt-6 h-0.5 w-full overflow-hidden rounded bg-border">
          <div className="h-full rounded bg-accent shadow-[0_0_10px_rgba(0,212,170,.55)] animate-loadingBar" />
        </div>
        <div className="mt-4 font-mono text-xs text-dim">{status || `Scoring${'.'.repeat(dots)}`}</div>
      </div>
    </div>
  );
}

function RevealCard({
  score,
  name,
  onContinue,
}: {
  score: number;
  name: string;
  onContinue: () => void;
}) {
  const grade = getGrade(score);
  const [ph, setPh] = useState(0);
  useEffect(() => {
    const t = [
      setTimeout(() => setPh(1), 250),
      setTimeout(() => setPh(2), 1500),
      setTimeout(() => setPh(3), 2300),
      setTimeout(() => setPh(4), 3100),
    ];
    return () => t.forEach(clearTimeout);
  }, []);

  return (
    <button
      type="button"
      onClick={() => {
        if (ph >= 4) onContinue();
      }}
      className="relative w-full rounded-2xl border border-border bg-surface p-8 text-center transition hover:border-accent/25"
      style={{ cursor: ph >= 4 ? 'pointer' : 'default' }}
    >
      <div
        className="pointer-events-none absolute left-1/2 top-1/2 h-[340px] w-[340px] -translate-x-1/2 -translate-y-1/2 rounded-full"
        style={{
          background: `radial-gradient(circle, ${grade.color}14 0%, transparent 70%)`,
          opacity: ph >= 1 ? 1 : 0,
          transition: 'opacity 1.5s',
        }}
      />
      <div
        className="font-mono text-[11px] uppercase tracking-[.18em] text-dim"
        style={{
          opacity: ph >= 1 ? 1 : 0,
          transform: ph >= 1 ? 'none' : 'translateY(8px)',
          transition: 'all .8s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {name}
      </div>
      <div
        className="mt-4 font-display text-[clamp(64px,14vw,130px)] leading-none"
        style={{
          color: grade.color,
          opacity: ph >= 1 ? 1 : 0,
          transform: ph >= 1 ? 'scale(1)' : 'scale(.85)',
          transition: 'all 1s cubic-bezier(.16,1,.3,1)',
          textShadow: `0 0 44px ${grade.color}22`,
        }}
      >
        {ph >= 1 ? <AnimNum value={score} dur={1200} /> : '0.0'}
      </div>
      <div
        className="mt-1 font-display text-[clamp(24px,5vw,40px)] font-bold tracking-[.14em]"
        style={{
          color: grade.color,
          opacity: ph >= 2 ? 1 : 0,
          transform: ph >= 2 ? 'none' : 'translateY(12px)',
          transition: 'all .8s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {grade.letter}
      </div>
      <div
        className="mt-1 font-body text-sm text-muted"
        style={{
          opacity: ph >= 3 ? 1 : 0,
          transform: ph >= 3 ? 'none' : 'translateY(8px)',
          transition: 'all .8s cubic-bezier(.16,1,.3,1)',
        }}
      >
        {grade.label}
      </div>
      <div className="mt-10 font-mono text-[11px] text-dim" style={{ opacity: ph >= 4 ? 1 : 0 }}>
        <span className={ph >= 4 ? 'animate-pulseDim' : ''}>TAP TO CONTINUE</span>
      </div>
    </button>
  );
}

export default function RepoAuditApp() {
  const [screen, setScreen] = useState<Screen>('input');
  const [result, setResult] = useState<AuditResult | null>(null);
  const [error, setError] = useState('');
  const [repoName, setRepoName] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareErr, setShareErr] = useState('');

  const total = useMemo(() => (result ? computeTotal(result.scores) : 0), [result]);

  useEffect(() => {
    if (screen !== 'loading') return;
    let idx = 0;
    const stages = ['Fetching GitHub signals...', 'Running deterministic scoring...', 'Workers AI qualitative pass...'];
    setStatus(stages[0]!);
    const t = setInterval(() => {
      idx = Math.min(idx + 1, stages.length - 1);
      setStatus(stages[idx]!);
    }, 1200);
    return () => clearInterval(t);
  }, [screen]);

  const share = useCallback(async () => {
    if (!result) return;
    setSharing(true);
    setShareErr('');
    setShareUrl('');
    try {
      const res = await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result }),
      });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as { id: string; url: string };
      setShareUrl(json.url);
      try {
        await navigator.clipboard.writeText(json.url);
      } catch {
        // Clipboard may be unavailable (permissions/browser); we still show the URL.
      }
    } catch (err: any) {
      setShareErr(String(err?.message || 'Share failed'));
    } finally {
      setSharing(false);
    }
  }, [result]);

  const audit = useCallback(async (repo: string, opts: { ai: boolean; model: string; ghToken?: string }) => {
    setError('');
    setResult(null);
    setRepoName(repo);
    setLoading(true);
    setScreen('loading');
    setShareUrl('');
    setShareErr('');

    try {
      const qp = new URLSearchParams({ repo });
      if (!opts.ai) qp.set('ai', '0');
      if (opts.ai && opts.model) qp.set('model', opts.model);

      const headers: Record<string, string> = {};
      if (opts.ghToken) headers['x-github-token'] = opts.ghToken;
      const res = await fetch(`/api/audit?${qp.toString()}`, { headers: Object.keys(headers).length ? headers : undefined });
      if (!res.ok) throw new Error(await res.text());
      const json = (await res.json()) as AuditResult;
      setResult(json);
      setLoading(false);
      setScreen('reveal');
    } catch (err: any) {
      setError(String(err?.message || 'Something went wrong'));
      setLoading(false);
      setScreen('input');
    }
  }, []);

  if (screen === 'input') {
    return <InputCard onSubmit={(r, o) => audit(r, o)} error={error} loading={loading} />;
  }

  if (screen === 'loading') {
    return <LoadingCard name={repoName} status={status} />;
  }

  if (screen === 'reveal' && result) {
    return <RevealCard score={total} name={result.meta?.full_name || repoName} onContinue={() => setScreen('results')} />;
  }

  if (screen === 'results' && result) {
    return (
      <ResultsView
        result={result}
        actions={
          <>
            <button
              type="button"
              onClick={share}
              disabled={sharing}
              className="rounded-xl border border-border bg-surface px-4 py-2 font-mono text-[11px] text-muted transition hover:border-accent/40 hover:text-text disabled:opacity-50"
            >
              {sharing ? 'Sharing…' : 'Share'}
            </button>
            {shareUrl ? (
              <a
                className="rounded-xl border border-accent/25 bg-accent/10 px-4 py-2 font-mono text-[11px] text-accent transition hover:border-accent/45"
                href={shareUrl}
              >
                Link copied
              </a>
            ) : null}
            {shareErr ? <div className="self-center font-mono text-[11px] text-bad">{shareErr}</div> : null}
          </>
        }
        footer={
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => (setScreen('input'), setResult(null), setError(''))}
              className="rounded-xl border border-border bg-surface px-5 py-3 font-mono text-xs text-muted transition hover:border-accent/40 hover:text-text"
            >
              Audit Another
            </button>
          </div>
        }
      />
    );
  }

  return null;
}
