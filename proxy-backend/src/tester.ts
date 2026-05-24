import { Agent, ProxyAgent, fetch as uFetch } from 'undici'
import { SocksClient } from 'socks'
import type { Socket } from 'node:net'

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

type Protocol = 'http' | 'socks4' | 'socks5'

function createDispatcher(
  host: string,
  port: number,
  protocol: Protocol,
  username?: string,
  password?: string,
) {
  if (protocol === 'socks4' || protocol === 'socks5') {
    const socksType = protocol === 'socks4' ? 4 : 5
    return new Agent({
      connect: async (options, callback) => {
        try {
          const { socket } = await SocksClient.createConnection({
            proxy: {
              host,
              port,
              type: socksType,
              userId: username,
              password: protocol === 'socks5' ? password : undefined,
            },
            command: 'connect',
            destination: {
              host: options.hostname!,
              port: typeof options.port === 'string' ? parseInt(options.port) : (options.port ?? 80),
            },
          })
          callback(null, socket as Socket)
        } catch (err) {
          callback(err as Error, null)
        }
      },
    })
  }

  // HTTP proxy
  const auth = username && password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : ''
  return new ProxyAgent({ uri: `http://${auth}${host}:${port}` })
}

async function proxyFetch(
  dispatcher: Agent | ProxyAgent,
  targetUrl: string,
  timeoutMs: number,
) {
  return uFetch(targetUrl, {
    dispatcher,
    signal: AbortSignal.timeout(timeoutMs),
  })
}

export async function testProxy(
  host: string,
  port: number,
  username: string | undefined,
  password: string | undefined,
  timeoutMs: number,
  protocol: Protocol = 'http',
): Promise<TestResult> {
  const dispatcher = createDispatcher(host, port, protocol, username, password)

  let ms = 0
  const start = Date.now()
  const ipPromise = proxyFetch(dispatcher, 'http://ip-api.com/json', timeoutMs).then(r => {
    ms = Date.now() - start
    return r
  })

  const [ipResult, anonResult] = await Promise.allSettled([
    ipPromise,
    proxyFetch(dispatcher, 'http://httpbin.org/headers', Math.min(timeoutMs, 8000)),
  ])

  if (ipResult.status === 'rejected') {
    const msg = ipResult.reason instanceof Error ? ipResult.reason.message : 'Unknown error'
    return { ok: false, error: msg.toLowerCase().includes('timeout') || msg.includes('abort') ? 'Timeout' : msg }
  }

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
