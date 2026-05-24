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
  errorDetail?: string
}

function getErrnoCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined
  const code = (err as NodeJS.ErrnoException).code
  if (code) return code
  // undici wraps network errors inside err.cause
  const cause = (err as { cause?: unknown }).cause
  if (cause instanceof Error) return (cause as NodeJS.ErrnoException).code
  return undefined
}

function categorizeError(err: unknown): { error: string; errorDetail: string } {
  const code = getErrnoCode(err)
  const msg = err instanceof Error ? err.message : String(err)
  const lmsg = msg.toLowerCase()

  if (code === 'ECONNREFUSED')  return { error: 'Refused',      errorDetail: 'Connection refused — proxy port is closed or server is offline' }
  if (code === 'ENOTFOUND')     return { error: 'DNS Failed',   errorDetail: `Could not resolve proxy hostname` }
  if (code === 'ECONNRESET')    return { error: 'Reset',        errorDetail: 'Connection was reset by the proxy server' }
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH')
                                return { error: 'Unreachable',  errorDetail: 'Network or host unreachable' }
  if (code === 'ECONNABORTED')  return { error: 'Aborted',      errorDetail: 'Connection was aborted' }
  if (lmsg.includes('timeout') || lmsg.includes('abort') || code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT')
                                return { error: 'Timeout',      errorDetail: 'Proxy did not respond within the timeout period' }
  if (lmsg.includes('socks'))   return { error: 'SOCKS Error',  errorDetail: msg }

  return { error: 'Failed', errorDetail: msg }
}

function categorizeHttpError(status: number): { error: string; errorDetail: string } {
  if (status === 407) return { error: 'Auth Required', errorDetail: 'Proxy requires authentication (HTTP 407) — add username and password' }
  if (status === 401) return { error: 'Unauthorized',  errorDetail: 'Invalid proxy credentials (HTTP 401)' }
  if (status === 403) return { error: 'Forbidden',     errorDetail: 'Proxy refused the request (HTTP 403)' }
  if (status === 429) return { error: 'Rate Limited',  errorDetail: 'Too many requests to the proxy (HTTP 429)' }
  if (status >= 400 && status < 500) return { error: `Error ${status}`, errorDetail: `Proxy returned client error HTTP ${status}` }
  if (status >= 500) return { error: 'Server Error',   errorDetail: `Proxy server returned HTTP ${status}` }
  return { error: `HTTP ${status}`, errorDetail: `Unexpected HTTP status ${status}` }
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

  const anonTimeout = Math.min(timeoutMs, 5000)

  // Run ip check and anon check concurrently
  const start = Date.now()
  let ms = 0
  const [ipSettled, anonResp] = await Promise.all([
    Promise.allSettled([
      proxyFetch(dispatcher, 'http://ip-api.com/json', timeoutMs).then(r => { ms = Date.now() - start; return r }),
    ]).then(([r]) => r),
    // Race two independent judge services — whichever responds first wins
    Promise.any([
      proxyFetch(dispatcher, 'http://httpbin.org/headers', anonTimeout),
      proxyFetch(dispatcher, 'http://postman-echo.com/headers', anonTimeout),
    ]).catch(() => null),
  ])

  if (ipSettled.status === 'rejected') {
    return { ok: false, ...categorizeError(ipSettled.reason) }
  }

  const ipResp = ipSettled.value
  if (!ipResp.ok) return { ok: false, ...categorizeHttpError(ipResp.status) }

  const data = await ipResp.json() as IpApiResponse
  if (data.status !== 'success' || !data.query) return { ok: false, error: 'IP lookup failed', errorDetail: 'Connected to proxy but IP lookup returned an unexpected response' }

  let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
  if (anonResp?.ok) {
    try {
      const anonData = await anonResp.json() as { headers?: Record<string, string> }
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
