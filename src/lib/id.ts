const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function randomId(len = 10): string {
  const out: string[] = [];
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) out.push(ALPHABET[bytes[i]! % ALPHABET.length]!);
  return out.join('');
}

