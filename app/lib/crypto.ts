export interface DecryptedProxy {
  host: string
  port: number
  username?: string
  password?: string
  protocol?: 'http' | 'socks4' | 'socks5'
}

export async function decryptPayload(
  epkB64: string,
  ivB64: string,
  ctB64: string,
  privateKeyJwk: string,
): Promise<DecryptedProxy> {
  const serverPrivKey = await crypto.subtle.importKey(
    'jwk',
    JSON.parse(privateKeyJwk) as JsonWebKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey'],
  )
  const clientPub = await crypto.subtle.importKey(
    'raw',
    Uint8Array.from(atob(epkB64), c => c.charCodeAt(0)),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const aesKey = await crypto.subtle.deriveKey(
    { name: 'ECDH', public: clientPub },
    serverPrivKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plain = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: Uint8Array.from(atob(ivB64), c => c.charCodeAt(0)) },
    aesKey,
    Uint8Array.from(atob(ctB64), c => c.charCodeAt(0)),
  )
  return JSON.parse(new TextDecoder().decode(plain)) as DecryptedProxy
}
