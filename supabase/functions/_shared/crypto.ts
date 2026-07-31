// AES-GCM encryption for refresh tokens at rest, keyed by the
// TOKEN_ENCRYPTION_KEY edge function secret (a base64-encoded 32-byte key).
// Generate one with: openssl rand -base64 32

async function getKey(): Promise<CryptoKey> {
  const secret = Deno.env.get('TOKEN_ENCRYPTION_KEY')
  if (!secret) throw new Error('TOKEN_ENCRYPTION_KEY is not set')

  const rawKey = Uint8Array.from(atob(secret), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [
    'encrypt',
    'decrypt',
  ])
}

function toBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
}

function fromBase64(value: string): Uint8Array {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0))
}

export async function encryptToken(
  plaintext: string,
): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    encoded,
  )
  return {
    ciphertext: toBase64(new Uint8Array(encrypted)),
    iv: toBase64(iv),
  }
}

export async function decryptToken(
  ciphertext: string,
  iv: string,
): Promise<string> {
  const key = await getKey()
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: fromBase64(iv) },
    key,
    fromBase64(ciphertext),
  )
  return new TextDecoder().decode(decrypted)
}
