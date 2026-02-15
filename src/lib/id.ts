const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function randomId(len = 10): string {
  const out: string[] = [];
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out.push(ALPHABET[bytes[i]! % ALPHABET.length]!);
  return out.join('');
}


/**
 * Deterministic ID for a repo, used so re-auditing the same repo
 * overwrites the previous share instead of creating duplicates.
 */
export async function repoId(fullName: string): Promise<string> {
  const normalized = fullName.trim().toLowerCase();
  const data = new TextEncoder().encode(normalized);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const bytes = new Uint8Array(hash);
  const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const out: string[] = [];
  for (let i = 0; i < 10; i++) out.push(ALPHABET[bytes[i]! % ALPHABET.length]!);
  return out.join('');
}
