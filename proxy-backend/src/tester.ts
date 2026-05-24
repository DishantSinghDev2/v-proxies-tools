import { ProxyAgent, fetch as uFetch, type Response as UResponse } from 'undici'

interface IpApiResponse {
  status: string
  query?: string
  countryCode?: string
  city?: string
  regionName?: string
  isp?: string
}

export interface TestResult {
  ok: boolean
  ip?: string
  ms?: number
  anonymity?: 'elite' | 'anonymous' | 'transparent' | 'unknown'
  country?: string
  countryCode?: string
  city?: string
  region?: string
  isp?: string
  error?: string
}

async function proxyFetch(proxyUrl: string, targetUrl: string, timeoutMs: number): Promise<UResponse> {
  const agent = new ProxyAgent({ uri: proxyUrl, connectTimeout: timeoutMs, headersTimeout: timeoutMs })
  return uFetch(targetUrl, {
    dispatcher: agent,
    signal: AbortSignal.timeout(timeoutMs),
  }) as unknown as UResponse
}

export async function testProxy(
  host: string,
  port: number,
  username: string | undefined,
  password: string | undefined,
  timeoutMs: number,
): Promise<TestResult> {
  const auth = username && password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : ''
  const proxyUrl = `http://${auth}${host}:${port}`
  const start = Date.now()

  const [ipResult, anonResult] = await Promise.allSettled([
    proxyFetch(proxyUrl, 'http://ip-api.com/json', timeoutMs),
    proxyFetch(proxyUrl, 'http://httpbin.org/headers', Math.min(timeoutMs, 8000)),
  ])

  if (ipResult.status === 'rejected') {
    const msg = ipResult.reason instanceof Error ? ipResult.reason.message : 'Unknown error'
    return { ok: false, error: msg.toLowerCase().includes('timeout') || msg.includes('abort') ? 'Timeout' : msg }
  }

  const ms = Date.now() - start
  const ipResp = ipResult.value
  if (!ipResp.ok) return { ok: false, error: `HTTP ${ipResp.status}` }

  const data = await ipResp.json() as IpApiResponse
  if (data.status !== 'success' || !data.query) return { ok: false, error: 'IP lookup failed' }

  let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
  if (anonResult.status === 'fulfilled') {
    try {
      const anonData = await anonResult.value.json() as { headers?: Record<string, string> }
      const keys = Object.keys(anonData.headers ?? {}).map(k => k.toLowerCase())
      if (keys.some(k => ['x-forwarded-for', 'x-real-ip', 'forwarded'].includes(k))) {
        anonymity = 'transparent'
      } else if (keys.some(k => k === 'via' || k.startsWith('proxy-') || k === 'x-proxy-id')) {
        anonymity = 'anonymous'
      } else {
        anonymity = 'elite'
      }
    } catch { /* best-effort */ }
  }

  return {
    ok: true,
    ip: data.query,
    ms,
    anonymity,
    country: data.countryCode,
    countryCode: data.countryCode,
    city: data.city,
    region: data.regionName,
    isp: data.isp ?? '',
  }
}
