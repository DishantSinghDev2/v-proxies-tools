import { NextRequest, NextResponse } from 'next/server'
import { HttpsProxyAgent } from 'https-proxy-agent'

export const runtime = 'nodejs'

const TEST_URL = 'https://ipinfo.io/json'
const ANON_URL = 'https://httpbin.org/headers'

export async function POST(req: NextRequest) {
  let body: { host: string; port: number; username?: string; password?: string; timeout?: number }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { host, port, username, password, timeout = 15000 } = body
  if (!host || !port) {
    return NextResponse.json({ ok: false, error: 'Missing host or port' }, { status: 400 })
  }

  const userPart = (username && password)
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : ''
  const proxyUrl = `http://${userPart}${host}:${port}`
  const agent = new HttpsProxyAgent(proxyUrl)

  const ac = new AbortController()
  const timer = setTimeout(() => ac.abort(), timeout)
  const start = Date.now()

  try {
    const res = await fetch(TEST_URL, {
      // @ts-expect-error node fetch agent
      agent,
      signal: ac.signal,
      headers: { 'User-Agent': 'curl/8.0' },
    })
    clearTimeout(timer)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)

    const data = await res.json() as {
      ip?: string; country?: string; city?: string; region?: string; org?: string
    }
    const ms = Date.now() - start
    const isp = data.org?.replace(/^AS\d+\s*/, '') ?? ''

    let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
    try {
      const anonAc = new AbortController()
      const anonTimer = setTimeout(() => anonAc.abort(), Math.min(timeout, 8000))
      const anonRes = await fetch(ANON_URL, {
        // @ts-expect-error node fetch agent
        agent,
        signal: anonAc.signal,
        headers: { 'User-Agent': 'curl/8.0' },
      })
      clearTimeout(anonTimer)
      if (anonRes.ok) {
        const anonData = await anonRes.json() as { headers?: Record<string, string> }
        const keys = Object.keys(anonData.headers ?? {}).map(k => k.toLowerCase())
        if (keys.some(k => k === 'x-forwarded-for' || k === 'x-real-ip' || k === 'forwarded')) {
          anonymity = 'transparent'
        } else if (keys.some(k => k === 'via' || k.startsWith('proxy-') || k === 'x-proxy-id')) {
          anonymity = 'anonymous'
        } else {
          anonymity = 'elite'
        }
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      ok: true,
      ip: data.ip,
      ms,
      anonymity,
      country: data.country,
      countryCode: data.country,
      city: data.city,
      region: data.region,
      isp,
    })
  } catch (err: unknown) {
    clearTimeout(timer)
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const isTimeout = msg.includes('abort') || msg.includes('Timeout') || msg.includes('timed out')
    return NextResponse.json({ ok: false, error: isTimeout ? 'Timeout' : msg })
  }
}
