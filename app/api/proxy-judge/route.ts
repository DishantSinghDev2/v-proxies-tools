import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  // Prefer the last entry in x-forwarded-for — that's the proxy's exit IP,
  // not the Render load-balancer address that appears first.
  const xfwdRaw = req.headers.get('x-forwarded-for')
  const ip =
    (xfwdRaw ? xfwdRaw.split(',').map(s => s.trim()).at(-1) : undefined) ||
    req.headers.get('x-real-ip') ||
    'unknown'

  return NextResponse.json({ ip, headers })
}
