import { NextRequest, NextResponse } from 'next/server'
import type { Socket } from 'cloudflare:sockets'

export const runtime = 'nodejs'

// Lazy-loaded at request time only — not available in Node.js build environment
async function cfConnect(hostname: string, port: number): Promise<Socket> {
  const mod = await import(
    /* webpackIgnore: true */
    /* turbopackIgnore: true */
    'cloudflare:sockets'
  ) as { connect: (address: { hostname: string; port: number }) => Socket }
  return mod.connect({ hostname, port })
}

interface IpApiResponse {
  status: string
  query?: string
  countryCode?: string
  city?: string
  regionName?: string
  isp?: string
}

function buildProxyRequest(targetHost: string, targetPath: string, proxyAuth: string): Uint8Array {
  const lines = [
    `GET http://${targetHost}${targetPath} HTTP/1.1`,
    `Host: ${targetHost}`,
    ...(proxyAuth ? [`Proxy-Authorization: Basic ${btoa(proxyAuth)}`] : []),
    'User-Agent: curl/8.0',
    'Accept: application/json',
    'Accept-Encoding: identity',
    'Connection: close',
    '',
    '',
  ]
  return new TextEncoder().encode(lines.join('\r\n'))
}

function decodeChunked(body: string): string {
  let result = ''
  let pos = 0
  while (pos < body.length) {
    const lineEnd = body.indexOf('\r\n', pos)
    if (lineEnd === -1) break
    const size = parseInt(body.slice(pos, lineEnd), 16)
    if (isNaN(size) || size === 0) break
    result += body.slice(lineEnd + 2, lineEnd + 2 + size)
    pos = lineEnd + 2 + size + 2
  }
  return result
}

function parseHttpResponse(raw: string): { status: number; body: string } {
  const sep = raw.indexOf('\r\n\r\n')
  if (sep === -1) throw new Error('Malformed HTTP response')
  const headerSection = raw.slice(0, sep)
  let body = raw.slice(sep + 4)
  const status = parseInt(headerSection.split('\r\n')[0].split(' ')[1] ?? '0', 10)
  if (headerSection.toLowerCase().includes('transfer-encoding: chunked')) {
    body = decodeChunked(body)
  }
  return { status, body }
}

async function proxyFetch(
  proxyHost: string,
  proxyPort: number,
  targetHost: string,
  targetPath: string,
  proxyAuth: string,
  timeoutMs: number,
): Promise<{ status: number; body: string; ms: number }> {
  const socket = await cfConnect(proxyHost, proxyPort)
  const writer = socket.writable.getWriter()
  const reader = socket.readable.getReader()
  const start = Date.now()

  await writer.write(buildProxyRequest(targetHost, targetPath, proxyAuth))
  writer.releaseLock()

  const decoder = new TextDecoder()
  let raw = ''
  const deadline = Date.now() + timeoutMs

  while (true) {
    const remaining = deadline - Date.now()
    if (remaining <= 0) throw new Error('Timeout')
    const result = await Promise.race([
      reader.read() as Promise<{ done: boolean; value?: Uint8Array }>,
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('Timeout')), remaining)),
    ])
    if (result.done) break
    if (result.value) raw += decoder.decode(result.value, { stream: true })
  }

  reader.releaseLock()
  socket.close()

  const { status, body } = parseHttpResponse(raw)
  return { status, body, ms: Date.now() - start }
}

export async function POST(req: NextRequest) {
  let input: { host: string; port: number; username?: string; password?: string; timeout?: number }
  try {
    input = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  const { host, port, username, password, timeout = 15000 } = input
  if (!host || !port) {
    return NextResponse.json({ ok: false, error: 'Missing host or port' }, { status: 400 })
  }

  const proxyAuth = username && password ? `${username}:${password}` : ''

  try {
    const { status, body, ms } = await proxyFetch(
      host, port, 'ip-api.com', '/json', proxyAuth, timeout,
    )
    if (status !== 200) throw new Error(`HTTP ${status}`)

    const data = JSON.parse(body) as IpApiResponse
    if (data.status !== 'success' || !data.query) throw new Error('IP lookup failed')

    let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
    try {
      const { body: anonBody } = await proxyFetch(
        host, port, 'httpbin.org', '/headers', proxyAuth, Math.min(timeout, 8000),
      )
      const anonData = JSON.parse(anonBody) as { headers?: Record<string, string> }
      const keys = Object.keys(anonData.headers ?? {}).map(k => k.toLowerCase())
      if (keys.some(k => ['x-forwarded-for', 'x-real-ip', 'forwarded'].includes(k))) {
        anonymity = 'transparent'
      } else if (keys.some(k => k === 'via' || k.startsWith('proxy-') || k === 'x-proxy-id')) {
        anonymity = 'anonymous'
      } else {
        anonymity = 'elite'
      }
    } catch { /* best-effort */ }

    return NextResponse.json({
      ok: true,
      ip: data.query,
      ms,
      anonymity,
      country: data.countryCode,
      countryCode: data.countryCode,
      city: data.city,
      region: data.regionName,
      isp: data.isp ?? '',
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    const isTimeout = msg.toLowerCase().includes('timeout') || msg.includes('abort')
    return NextResponse.json({ ok: false, error: isTimeout ? 'Timeout' : msg })
  }
}
