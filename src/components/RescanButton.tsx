import { useState } from 'react';

const MODELS = [
  { id: '@cf/zai-org/glm-4.7-flash', label: 'glm-4.7-flash', note: 'Fast default' },
  { id: '@cf/openai/gpt-oss-20b', label: 'gpt-oss-20b', note: 'Balanced' },
  { id: '@cf/openai/gpt-oss-120b', label: 'gpt-oss-120b', note: 'Best quality' },
  { id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', label: 'llama-3.3-70b', note: 'Strong general' },
  { id: '@cf/meta/llama-4-scout-17b-16e-instruct', label: 'llama-4-scout', note: 'Fast' },
  { id: '@cf/meta/llama-4-maverick-17b-128e-instruct-fp8', label: 'llama-4-maverick', note: 'Higher quality' },
];

type Phase = 'idle' | 'options' | 'scanning' | 'done' | 'error';

export default function RescanButton({ repo }: { repo: string }) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [ai, setAi] = useState(true);
  const [model, setModel] = useState(MODELS[0]!.id);
  const [customModel, setCustomModel] = useState('');
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');

  const scan = async () => {
    setPhase('scanning');
    setError('');
    setProgress('Fetching repo data…');

    try {
      const qp = new URLSearchParams({ repo, fresh: '1' });
      if (!ai) qp.set('ai', '0');
      else {
        const m = customModel.trim() || model;
        if (m) qp.set('model', m);
      }

      const res = await fetch(`/api/audit?${qp.toString()}`);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `HTTP ${res.status}`);
      }

      setProgress('Saving result…');
      const result = await res.json();

      const shareRes = await fetch('/api/share', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ result }),
      });

      if (!shareRes.ok) throw new Error('Failed to save result');
      const { url } = (await shareRes.json()) as { url: string };

      setPhase('done');
      setProgress('Redirecting…');
      window.location.assign(url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Scan failed');
      setPhase('error');
    }
  };

  if (phase === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setPhase('options')}
        className="rounded-xl border border-border bg-surface px-5 py-3 font-mono text-xs text-muted transition hover:border-accent/40 hover:text-text"
      >
        Re-scan
      </button>
    );
  }

  if (phase === 'scanning' || phase === 'done') {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-accent/25 bg-accent/5 px-5 py-3">
        <svg className="h-4 w-4 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeDasharray="50 20" />
        </svg>
        <span className="font-mono text-xs text-accent">{progress}</span>
      </div>
    );
  }

  if (phase === 'error') {
    return (
      <div className="space-y-2">
        <div className="rounded-xl border border-bad/25 bg-bad/5 px-5 py-3 font-mono text-xs text-bad">
          {error}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPhase('options')}
            className="rounded-lg border border-border bg-surface px-3 py-2 font-mono text-[11px] text-muted transition hover:text-text"
          >
            Back
          </button>
          <button
            type="button"
            onClick={scan}
            className="rounded-lg border border-accent/30 bg-accent/10 px-3 py-2 font-mono text-[11px] text-accent transition hover:bg-accent/20"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // phase === 'options'
  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[11px] text-dim">Re-scan <span className="text-muted">{repo}</span></span>
        <button
          type="button"
          onClick={() => setPhase('idle')}
          className="font-mono text-[11px] text-dim hover:text-text"
        >
          ✕
        </button>
      </div>

      <div className="flex items-center gap-3 cursor-pointer">
        <div
          className={`relative h-5 w-9 rounded-full transition-colors ${
            ai ? 'bg-accent' : 'bg-border'
          }`}
          onClick={() => setAi(!ai)}
          onKeyDown={() => {}}
          role="switch"
          aria-checked={ai}
          tabIndex={0}
        >
          <div
            className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform ${
              ai ? 'translate-x-4' : 'translate-x-0.5'
            }`}
          />
        </div>
        <span className="font-mono text-xs text-muted">Workers AI review</span>
        <span className="font-mono text-[10px] text-dim">{ai ? 'on' : 'off'}</span>
      </div>

      {ai && (
        <div className="space-y-2">
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-muted"
          >
            {MODELS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="or paste any @cf/... model id"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            className="w-full rounded-lg border border-border bg-bg px-3 py-2 font-mono text-xs text-muted placeholder:text-dim/50"
          />
          <div className="font-mono text-[10px] text-dim">
            {customModel.trim()
              ? 'Using custom model'
              : MODELS.find((m) => m.id === model)?.note ?? ''}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={scan}
        className="w-full rounded-lg bg-accent px-4 py-2.5 font-mono text-xs font-semibold text-bg transition hover:brightness-95 active:brightness-90"
      >
        Scan now
      </button>
    </div>
  );
}
