import { Agent, ProxyAgent, fetch as uFetch } from 'undici'
import { SocksClient } from 'socks'
import geoip from 'geoip-lite'
import type { Socket } from 'node:net'

export type Protocol = 'http' | 'socks4' | 'socks5'

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
  if (process.env.JUDGE_URL) return process.env.JUDGE_URL
  if (process.env.RENDER_EXTERNAL_URL) return `${process.env.RENDER_EXTERNAL_URL}/api/proxy-judge`
  return 'http://localhost:3000/api/proxy-judge'
}

const regionNames = new Intl.DisplayNames(['en'], { type: 'region' })

function getErrnoCode(err: unknown): string | undefined {
  if (!(err instanceof Error)) return undefined
  const code = (err as NodeJS.ErrnoException).code
  if (code) return code
  const cause = (err as { cause?: unknown }).cause
  if (cause instanceof Error) return (cause as NodeJS.ErrnoException).code
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
  const start = Date.now()

  // Single request through the proxy to our own judge endpoint
  let judgeData: { ip: string; headers: Record<string, string> }
  try {
    const resp = await proxyFetch(dispatcher, judgeUrl, timeoutMs)
    const ms_raw = Date.now() - start
    if (!resp.ok) return { ok: false, ...categorizeHttpError(resp.status) }
    judgeData = await resp.json() as { ip: string; headers: Record<string, string> }
    if (!judgeData.ip || judgeData.ip === 'unknown') {
      return { ok: false, error: 'IP lookup failed', errorDetail: 'Proxy connected but exit IP could not be determined' }
    }
    // ms measured up to judge response headers (before body read — close enough)
    const ms = ms_raw

    const { ip, headers } = judgeData

    // Local geo lookup — instant, no network
    const geo = geoip.lookup(ip)
    const countryCode = geo?.country ?? ''
    const country = countryCode ? (regionNames.of(countryCode) ?? countryCode) : ''
    const city = geo?.city ?? ''
    const region = geo?.region ?? ''

    // ISP via direct call (not through proxy) — best-effort, non-blocking
    let isp = ''
    try {
      const ispResp = await uFetch(`http://ip-api.com/json/${ip}?fields=isp,org`, {
        signal: AbortSignal.timeout(3000),
      })
      if (ispResp.ok) {
        const ispData = await ispResp.json() as { isp?: string; org?: string }
        isp = ispData.isp || ispData.org || ''
      }
    } catch { /* non-critical */ }

    // Anonymity from headers returned by the judge
    const headerKeys = Object.keys(headers).map(k => k.toLowerCase())
    let anonymity: 'elite' | 'anonymous' | 'transparent' | 'unknown' = 'unknown'
    if (headerKeys.some(k => ['x-forwarded-for', 'x-real-ip', 'forwarded', 'client-ip'].includes(k))) {
      anonymity = 'transparent'
    } else if (headerKeys.some(k => k === 'via' || k.startsWith('proxy-') || k === 'x-proxy-id')) {
      anonymity = 'anonymous'
    } else {
      anonymity = 'elite'
    }

    return { ok: true, ip, ms, anonymity, country, countryCode, city, region, isp }
  } catch (err) {
    return { ok: false, ...categorizeError(err) }
  }
}
