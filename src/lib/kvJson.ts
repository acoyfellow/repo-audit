export async function kvGetJson<T>(kv: KVNamespace, key: string): Promise<T | null> {
  const txt = await kv.get(key);
  if (!txt) return null;
  try {
    return JSON.parse(txt) as T;
  } catch {
    return null;
  }
}

export async function kvPutJson(
  kv: KVNamespace,
  key: string,
  value: unknown,
  opts?: { expirationTtl?: number },
): Promise<void> {
  const txt = JSON.stringify(value);
  await kv.put(key, txt, opts);
}

