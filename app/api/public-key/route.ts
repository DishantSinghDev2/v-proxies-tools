import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET() {
  const publicKey = process.env.ECDH_PUBLIC_KEY_B64
  if (!publicKey) {
    return NextResponse.json({ error: 'Encryption not configured' }, { status: 503 })
  }
  return NextResponse.json({ publicKey }, {
    headers: { 'Cache-Control': 'public, max-age=3600' },
  })
}
