import { webcrypto } from 'node:crypto'
const { subtle } = webcrypto as unknown as Crypto

export function loadPrivateKey(jwkJson: string): Promise<CryptoKey> {
  return subtle.importKey(
    'jwk',
    JSON.parse(jwkJson) as JsonWebKey,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey'],
  )
}

export async function decryptPayload(
  epkB64: string,
  ivB64: string,
  ctB64: string,
  serverPrivKey: CryptoKey,
): Promise<string> {
  const clientPub = await subtle.importKey(
    'raw',
    Buffer.from(epkB64, 'base64'),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  )
  const aesKey = await subtle.deriveKey(
    { name: 'ECDH', public: clientPub },
    serverPrivKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt'],
  )
  const plain = await subtle.decrypt(
    { name: 'AES-GCM', iv: Buffer.from(ivB64, 'base64') },
    aesKey,
    Buffer.from(ctB64, 'base64'),
  )
  return Buffer.from(plain).toString('utf8')
}
