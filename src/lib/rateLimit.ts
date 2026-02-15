export type RateLimitKV = {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, opts?: { expirationTtl?: number }): Promise<void>;
};

export type RateLimitResult = {
  ok: boolean;
  limit: number;
  remaining: number;
  retryAfterSeconds: number;
  windowSeconds: number;
};

export async function rateLimitFixedWindow(args: {
  kv: RateLimitKV;
  key: string;
  limit: number;
  windowSeconds: number;
  nowMs?: number;
}): Promise<RateLimitResult> {
  const nowMs = args.nowMs ?? Date.now();
  const windowMs = args.windowSeconds * 1000;
  const windowId = Math.floor(nowMs / windowMs);
  const k = `rl:${args.key}:${args.windowSeconds}:${windowId}`;

  const raw = await args.kv.get(k);
  const prev = raw ? Number.parseInt(raw, 10) : 0;
  const next = Number.isFinite(prev) && prev > 0 ? prev + 1 : 1;

  // KV isn't atomic; slight overshoot is acceptable for cost-control throttling.
  await args.kv.put(k, String(next), { expirationTtl: args.windowSeconds + 5 });

  const resetInMs = (windowId + 1) * windowMs - nowMs;
  const retryAfterSeconds = Math.max(0, Math.ceil(resetInMs / 1000));
  const remaining = Math.max(0, args.limit - next);

  return {
    ok: next <= args.limit,
    limit: args.limit,
    remaining,
    retryAfterSeconds,
    windowSeconds: args.windowSeconds,
  };
}

