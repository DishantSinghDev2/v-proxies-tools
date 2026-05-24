import { Agent, ProxyAgent, fetch as uFetch } from 'undici'
import { SocksClient } from 'socks'
import type { Socket } from 'node:net'

export type Protocol = 'http' | 'socks4' | 'socks5'

interface IpApiResponse {
  status: string
  query?: string
  country?: string
  countryCode?: string
  city?: string
  regionName?: string
  isp?: string
}

interface JudgeResponse {
  ip: string
  headers: Record<string, string>
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

function getJudgeUrl(): string {
  return process.env.JUDGE_URL ?? 'https://tools.v-proxies.com/api/proxy-judge'
}

// Walk the full cause chain — undici sometimes wraps errors 2–3 levels deep
function getErrnoCode(err: unknown): string | undefined {
  let cur: unknown = err
  while (cur instanceof Error) {
    const code = (cur as NodeJS.ErrnoException).code
    if (code) return code
    cur = (cur as { cause?: unknown }).cause
  }
  return undefined
}

function categorizeError(err: unknown): { error: string; errorDetail: string } {
  const code = getErrnoCode(err)
  const msg = err instanceof Error ? err.message : String(err)
  const lmsg = msg.toLowerCase()

  if (code === 'ECONNREFUSED')  return { error: 'Refused',     errorDetail: 'Connection refused — proxy port is closed or server is offline' }
  if (code === 'ENOTFOUND')     return { error: 'DNS Failed',  errorDetail: 'Could not resolve proxy hostname' }
  if (code === 'ECONNRESET')    return { error: 'Reset',       errorDetail: 'Connection was reset by the proxy server' }
  if (code === 'ENETUNREACH' || code === 'EHOSTUNREACH')
                                return { error: 'Unreachable', errorDetail: 'Network or host unreachable' }
  if (code === 'ECONNABORTED')  return { error: 'Aborted',     errorDetail: 'Connection was aborted' }
  if (lmsg.includes('timeout') || lmsg.includes('abort') || code === 'ETIMEDOUT' || code === 'UND_ERR_CONNECT_TIMEOUT')
                                return { error: 'Timeout',     errorDetail: 'Proxy did not respond within the timeout period' }
  if (lmsg.includes('socks'))   return { error: 'SOCKS Error', errorDetail: msg }

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

function createDispatcher(
  host: string,
  port: number,
  protocol: Protocol,
  username?: string,
  password?: string,
): Agent | ProxyAgent {
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
  const auth = username && password
    ? `${encodeURIComponent(username)}:${encodeURIComponent(password)}@`
    : ''
  return new ProxyAgent({ uri: `http://${auth}${host}:${port}` })
}

async function proxyFetch(dispatcher: Agent | ProxyAgent, targetUrl: string, timeoutMs: number) {
  return uFetch(targetUrl, { dispatcher, signal: AbortSignal.timeout(timeoutMs) })
}

function detectAnonymity(judge: JudgeResponse): 'elite' | 'anonymous' | 'transparent' {
  const { ip: proxyIp, headers } = judge
  const lh: Record<string, string> = {}
  for (const [k, v] of Object.entries(headers)) lh[k.toLowerCase()] = v

  // Render's LB appends the connecting IP to x-forwarded-for.
  // Anything else in that list was added by the proxy itself → transparent.
  const xff = lh['x-forwarded-for'] ?? ''
  const xffIps = xff.split(',').map(s => s.trim()).filter(Boolean)
  const leakedInXff = xffIps.filter(ip => ip !== proxyIp)

  // x-real-ip set by Render will equal the proxy exit IP; any other value was proxy-injected.
  const xRealIp = lh['x-real-ip']
  const leakedXRealIp = xRealIp && xRealIp !== proxyIp

  if (leakedInXff.length > 0 || leakedXRealIp || lh['forwarded'] || lh['client-ip']) {
    return 'transparent'
  }
  if (lh['via'] || lh['proxy-connection'] || lh['x-proxy-id'] ||
      Object.keys(lh).some(k => k.startsWith('proxy-'))) {
    return 'anonymous'
  }
  return 'elite'
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
  const judgeUrl = getJudgeUrl()
  const anonTimeout = Math.min(timeoutMs, 5000)

  const start = Date.now()
  let ms = 0

  // Run both through the proxy concurrently:
  //  • ip-api.com → exit IP + geo + ISP  (ms stamped on first byte back)
  //  • our judge  → raw headers for anonymity detection
  //
  // Anonymity uses the judge's own detected IP to filter out headers Render's LB
  // adds itself (x-forwarded-for: <proxy_exit_ip>), so only proxy-leaked IPs flag
  // a connection as transparent.
  const [ipSettled, judgeSettled] = await Promise.all([
    Promise.allSettled([
      proxyFetch(dispatcher, 'http://ip-api.com/json', timeoutMs)
        .then(r => { ms = Date.now() - start; return r }),
    ]).then(([r]) => r),
    Promise.allSettled([
      proxyFetch(dispatcher, judgeUrl, anonTimeout),
    ]).then(([r]) => r),
  ])

  if (ipSettled.status === 'rejected') {
    return { ok: false, ...categorizeError(ipSettled.reason) }
  }

  const ipResp = ipSettled.value
  if (!ipResp.ok) return { ok: false, ...categorizeHttpError(ipResp.status) }

  const data = await ipResp.json() as IpApiResponse
  if (data.status !== 'success' || !data.query) {
    return { ok: false, error: 'IP lookup failed', errorDetail: 'Connected to proxy but IP lookup returned an unexpected response' }
  }

  let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
  if (judgeSettled.status === 'fulfilled' && judgeSettled.value.ok) {
    try {
      const judgeData = await judgeSettled.value.json() as JudgeResponse
      anonymity = detectAnonymity(judgeData)
    } catch { /* best-effort */ }
  }

  return {
    ok: true,
    ip: data.query,
    ms,
    anonymity,
    country: data.country ?? data.countryCode ?? '',
    countryCode: data.countryCode ?? '',
    city: data.city ?? '',
    region: data.regionName ?? '',
    isp: data.isp ?? '',
  }
}
