import { NextRequest, NextResponse } from 'next/server'
import { decryptPayload } from '@/app/lib/crypto'
import { testProxy } from '@/app/lib/tester'
import type { Protocol } from '@/app/lib/tester'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let input: {
    epk?: string; iv?: string; ct?: string
    host?: string; port?: number; username?: string; password?: string
    protocol?: Protocol
    timeout?: number
  }
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { timeout = 15000 } = input
  const isEncrypted = input.epk && input.iv && input.ct

  let host: string
  let port: number
  let username: string | undefined
  let password: string | undefined
  let protocol: Protocol = 'http'

  if (isEncrypted) {
    const privKeyJwk = process.env.ECDH_PRIVATE_KEY_JWK
    if (!privKeyJwk) {
      return NextResponse.json({ ok: false, error: 'Encryption key not configured' }, { status: 503 })
    }
    try {
      const decrypted = await decryptPayload(input.epk!, input.iv!, input.ct!, privKeyJwk)
      host = decrypted.host
      port = decrypted.port
      username = decrypted.username
      password = decrypted.password
      protocol = decrypted.protocol ?? 'http'
    } catch {
      return NextResponse.json({ ok: false, error: 'Decryption failed' }, { status: 400 })
    }
  } else if (input.host && input.port) {
    host = input.host
    port = input.port
    username = input.username
    password = input.password
    protocol = input.protocol ?? 'http'
  } else {
    return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
  }

  const result = await testProxy(host, port, username, password, timeout, protocol)
  return NextResponse.json(result)
}
