import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

export async function GET(req: NextRequest) {
  const headers: Record<string, string> = {}
  req.headers.forEach((v, k) => { headers[k] = v })

  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0].trim() ||
    req.headers.get('x-real-ip') ||
    'unknown'

  return NextResponse.json({ ip, headers })
}
