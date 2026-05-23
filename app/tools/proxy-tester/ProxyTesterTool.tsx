'use client'

import { useState, useRef, useCallback } from 'react'

type Protocol = 'http' | 'socks4' | 'socks5'
type Anonymity = 'elite' | 'anonymous' | 'transparent' | 'unknown'
type Status = 'idle' | 'testing' | 'alive' | 'dead'
type FilterMode = 'all' | 'alive' | 'dead'
type DelayOption = 0 | 500 | 1000 | 2000 | 5000

interface ParsedProxy {
  id: string
  host: string
  port: number
  username?: string
  password?: string
  protocol: Protocol
  raw: string
}

interface ProxyResult {
  id: string
  raw: string
  status: Status
  ip?: string
  ms?: number
  anonymity?: Anonymity
  country?: string
  countryCode?: string
  city?: string
  isp?: string
  error?: string
}

function parseProxy(line: string): ParsedProxy | null {
  const raw = line.trim()
  if (!raw || raw.startsWith('#')) return null

  let rest = raw
  let protocol: Protocol = 'http'
  let username = ''
  let password = ''

  const protoMatch = rest.match(/^(https?|socks[45]):\/\//i)
  if (protoMatch) {
    const p = protoMatch[1].toLowerCase()
    protocol = p === 'socks4' ? 'socks4' : p === 'socks5' ? 'socks5' : 'http'
    rest = rest.slice(protoMatch[0].length)
  }

  // user:pass@host:port
  const atIdx = rest.lastIndexOf('@')
  if (atIdx !== -1) {
    const creds = rest.slice(0, atIdx).split(':')
    username = creds[0] ?? ''
    password = creds.slice(1).join(':')
    rest = rest.slice(atIdx + 1)
  }

  const parts = rest.split(':')
  if (parts.length < 2) return null

  const host = parts[0]
  const port = parseInt(parts[1])
  if (!host || isNaN(port) || port < 1 || port > 65535) return null

  // host:port:user:pass format (no @)
  if (!username && parts.length === 4) {
    username = parts[2]
    password = parts[3]
  }

  return {
    id: `${host}:${port}:${Math.random().toString(36).slice(2)}`,
    host,
    port,
    username: username || undefined,
    password: password || undefined,
    protocol,
    raw,
  }
}

const ANON_STYLE: Record<Anonymity, { label: string; color: string }> = {
  elite:       { label: 'Elite',       color: '#22c55e' },
  anonymous:   { label: 'Anonymous',   color: '#3b82f6' },
  transparent: { label: 'Transparent', color: '#f59e0b' },
  unknown:     { label: 'Unknown',     color: '#6b7280' },
}

function AnonBadge({ level }: { level?: Anonymity }) {
  if (!level || level === 'unknown') return <span className="text-[#6b7280] text-xs">—</span>
  const s = ANON_STYLE[level]
  return (
    <span
      className="text-xs px-1.5 py-0.5 rounded font-mono"
      style={{ color: s.color, background: `${s.color}18`, border: `1px solid ${s.color}30` }}
    >
      {s.label}
    </span>
  )
}

function FlagEmoji({ code }: { code?: string }) {
  if (!code || code.length !== 2) return null
  const flag = [...code.toUpperCase()].map(c => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65)).join('')
  return <span className="mr-1">{flag}</span>
}

const DELAY_LABELS: Record<DelayOption, string> = {
  0: 'None', 500: '500 ms', 1000: '1 s', 2000: '2 s', 5000: '5 s',
}

export default function ProxyTesterTool() {
  const [mode, setMode] = useState<'single' | 'bulk'>('single')

  // Single mode state
  const [sHost, setSHost] = useState('')
  const [sPort, setSPort] = useState('')
  const [sUser, setSUser] = useState('')
  const [sPass, setSPass] = useState('')
  const [sProto, setSProto] = useState<Protocol>('http')
  const [sResult, setSResult] = useState<ProxyResult | null>(null)
  const [sTesting, setSTesting] = useState(false)

  // Bulk mode state
  const [bulkText, setBulkText] = useState('')
  const [results, setResults] = useState<ProxyResult[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [total, setTotal] = useState(0)
  const [filter, setFilter] = useState<FilterMode>('all')

  // Settings
  const [threads, setThreads] = useState(5)
  const [timeout, setTimeout_] = useState(15)
  const [delay, setDelay] = useState<DelayOption>(0)

  const abortRef = useRef(false)

  const testSingle = useCallback(async () => {
    if (!sHost || !sPort) return
    setSTesting(true)
    setSResult({ id: 'single', raw: `${sHost}:${sPort}`, status: 'testing' })
    try {
      const res = await fetch('/api/proxy-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host: sHost,
          port: parseInt(sPort),
          username: sUser || undefined,
          password: sPass || undefined,
          timeout: timeout * 1000,
        }),
      })
      const data = await res.json()
      setSResult({
        id: 'single',
        raw: `${sHost}:${sPort}`,
        status: data.ok ? 'alive' : 'dead',
        ...data,
      })
    } catch {
      setSResult({ id: 'single', raw: `${sHost}:${sPort}`, status: 'dead', error: 'Request failed' })
    } finally {
      setSTesting(false)
    }
  }, [sHost, sPort, sUser, sPass, timeout])

  const runBulk = useCallback(async () => {
    const proxies = bulkText
      .split('\n')
      .map(parseProxy)
      .filter((p): p is ParsedProxy => p !== null)

    if (proxies.length === 0) return

    abortRef.current = false
    setRunning(true)
    setProgress(0)
    setTotal(proxies.length)
    setResults(proxies.map(p => ({ id: p.id, raw: p.raw, status: 'idle' as Status })))

    let done = 0
    const queue = [...proxies]

    const worker = async () => {
      while (queue.length > 0 && !abortRef.current) {
        const proxy = queue.shift()!
        setResults(prev => prev.map(r => r.id === proxy.id ? { ...r, status: 'testing' } : r))

        try {
          const res = await fetch('/api/proxy-test', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              host: proxy.host,
              port: proxy.port,
              username: proxy.username,
              password: proxy.password,
              timeout: timeout * 1000,
            }),
          })
          const data = await res.json()
          setResults(prev => prev.map(r =>
            r.id === proxy.id
              ? { ...r, status: data.ok ? 'alive' : 'dead', ...data }
              : r
          ))
        } catch {
          setResults(prev => prev.map(r =>
            r.id === proxy.id ? { ...r, status: 'dead', error: 'Request failed' } : r
          ))
        }

        done++
        setProgress(done)

        if (delay > 0 && queue.length > 0 && !abortRef.current) {
          await new Promise(r => globalThis.setTimeout(r, delay))
        }
      }
    }

    const workers = Array.from({ length: Math.min(threads, proxies.length) }, () => worker())
    await Promise.all(workers)
    setRunning(false)
  }, [bulkText, threads, timeout, delay])

  const stopBulk = () => { abortRef.current = true }

  const exportResults = (format: 'txt' | 'csv') => {
    const alive = results.filter(r => r.status === 'alive')
    let content = ''
    if (format === 'txt') {
      content = alive.map(r => r.raw).join('\n')
    } else {
      const header = 'Proxy,Status,IP,Latency (ms),Country,City,ISP,Anonymity'
      const rows = results
        .filter(r => r.status === 'alive' || r.status === 'dead')
        .map(r =>
          [r.raw, r.status, r.ip ?? '', r.ms ?? '', r.country ?? '', r.city ?? '', r.isp ?? '', r.anonymity ?? '']
            .map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')
        )
      content = [header, ...rows].join('\n')
    }
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `proxies-${Date.now()}.${format}`
    a.click()
    URL.revokeObjectURL(url)
  }

  const visibleResults = results.filter(r =>
    filter === 'all' ? true : filter === 'alive' ? r.status === 'alive' : r.status === 'dead'
  )
  const aliveCount = results.filter(r => r.status === 'alive').length
  const deadCount = results.filter(r => r.status === 'dead').length

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Mode tabs */}
      <div className="flex gap-1 mb-6 bg-[#1a1a1a] rounded-lg p-1 w-fit">
        {(['single', 'bulk'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className="px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize"
            style={mode === m
              ? { background: '#22c55e', color: '#000' }
              : { color: '#9ca3af' }
            }
          >
            {m}
          </button>
        ))}
      </div>

      {mode === 'single' ? (
        <div className="space-y-4">
          {/* Single mode inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            <div className="md:col-span-2">
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">HOST / IP</label>
              <input
                value={sHost}
                onChange={e => setSHost(e.target.value)}
                placeholder="proxy.example.com"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">PORT</label>
              <input
                value={sPort}
                onChange={e => setSPort(e.target.value)}
                placeholder="8080"
                type="number"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">PROTOCOL</label>
              <select
                value={sProto}
                onChange={e => setSProto(e.target.value as Protocol)}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                <option value="http">HTTP/S</option>
                <option value="socks4">SOCKS4</option>
                <option value="socks5">SOCKS5</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">USERNAME</label>
              <input
                value={sUser}
                onChange={e => setSUser(e.target.value)}
                placeholder="optional"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">PASSWORD</label>
              <input
                value={sPass}
                onChange={e => setSPass(e.target.value)}
                placeholder="optional"
                type="password"
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white placeholder-[#3a3a3a] focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">TIMEOUT (s)</label>
              <input
                value={timeout}
                onChange={e => setTimeout_(Math.max(1, parseInt(e.target.value) || 15))}
                type="number"
                min={1}
                max={60}
                className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={testSingle}
                disabled={sTesting || !sHost || !sPort}
                className="w-full py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                style={{ background: '#22c55e', color: '#000' }}
              >
                {sTesting ? 'Testing…' : 'Test Proxy'}
              </button>
            </div>
          </div>

          {/* Single result */}
          {sResult && (
            <div className="border border-[#2a2a2a] rounded-xl p-5 bg-[#0f0f0f]">
              <div className="flex items-center gap-3 mb-4">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{
                    background: sResult.status === 'alive' ? '#22c55e'
                      : sResult.status === 'dead' ? '#ef4444'
                      : '#f59e0b',
                  }}
                />
                <span className="font-mono text-sm text-white">{sResult.raw}</span>
                <span
                  className="text-xs font-mono ml-auto"
                  style={{
                    color: sResult.status === 'alive' ? '#22c55e'
                      : sResult.status === 'dead' ? '#ef4444'
                      : '#f59e0b',
                  }}
                >
                  {sResult.status === 'testing' ? 'Testing…' : sResult.status.toUpperCase()}
                </span>
              </div>
              {sResult.status === 'alive' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Exit IP', value: sResult.ip },
                    { label: 'Latency', value: sResult.ms ? `${sResult.ms} ms` : undefined },
                    { label: 'Location', value: sResult.city && sResult.country ? `${sResult.city}, ${sResult.country}` : sResult.country },
                    { label: 'ISP', value: sResult.isp },
                  ].map(({ label, value }) => (
                    <div key={label}>
                      <p className="text-xs text-[#6b7280] font-mono mb-0.5">{label}</p>
                      <p className="text-sm text-white font-medium">{value ?? '—'}</p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs text-[#6b7280] font-mono mb-0.5">Anonymity</p>
                    <AnonBadge level={sResult.anonymity} />
                  </div>
                </div>
              )}
              {sResult.status === 'dead' && (
                <p className="text-sm text-[#ef4444] font-mono">{sResult.error ?? 'Connection failed'}</p>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Bulk settings bar */}
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">THREADS</label>
              <input
                value={threads}
                onChange={e => setThreads(Math.min(50, Math.max(1, parseInt(e.target.value) || 5)))}
                type="number"
                min={1}
                max={50}
                className="w-20 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">TIMEOUT (s)</label>
              <input
                value={timeout}
                onChange={e => setTimeout_(Math.max(1, parseInt(e.target.value) || 15))}
                type="number"
                min={1}
                max={60}
                className="w-20 bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              />
            </div>
            <div>
              <label className="block text-xs text-[#6b7280] mb-1 font-mono">DELAY</label>
              <select
                value={delay}
                onChange={e => setDelay(parseInt(e.target.value) as DelayOption)}
                className="bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#22c55e] transition-colors"
              >
                {(Object.entries(DELAY_LABELS) as [string, string][]).map(([v, l]) => (
                  <option key={v} value={v}>{l}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 ml-auto">
              {!running ? (
                <button
                  onClick={runBulk}
                  disabled={!bulkText.trim()}
                  className="px-5 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-40"
                  style={{ background: '#22c55e', color: '#000' }}
                >
                  Test All
                </button>
              ) : (
                <button
                  onClick={stopBulk}
                  className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#ef4444] text-white"
                >
                  Stop
                </button>
              )}
            </div>
          </div>

          {/* Proxy list textarea */}
          <div>
            <label className="block text-xs text-[#6b7280] mb-1 font-mono">
              PROXY LIST — one per line: host:port or host:port:user:pass or user:pass@host:port
            </label>
            <textarea
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              rows={6}
              placeholder={'192.168.1.1:8080\n192.168.1.2:8080:user:pass\nuser:pass@192.168.1.3:8080'}
              className="w-full bg-[#111] border border-[#2a2a2a] rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-[#3a3a3a] focus:outline-none focus:border-[#22c55e] transition-colors resize-y"
            />
          </div>

          {/* Progress */}
          {(running || results.length > 0) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-[#6b7280]">
                <span>
                  {progress}/{total} tested
                  {aliveCount > 0 && <span className="text-[#22c55e] ml-2">{aliveCount} alive</span>}
                  {deadCount > 0 && <span className="text-[#ef4444] ml-2">{deadCount} dead</span>}
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => exportResults('txt')}
                    disabled={aliveCount === 0}
                    className="px-2 py-0.5 rounded border border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#444] transition-colors disabled:opacity-30"
                  >
                    Export TXT
                  </button>
                  <button
                    onClick={() => exportResults('csv')}
                    disabled={results.filter(r => r.status !== 'idle' && r.status !== 'testing').length === 0}
                    className="px-2 py-0.5 rounded border border-[#2a2a2a] text-[#9ca3af] hover:text-white hover:border-[#444] transition-colors disabled:opacity-30"
                  >
                    Export CSV
                  </button>
                </div>
              </div>
              {running && (
                <div className="w-full h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{ width: `${total > 0 ? (progress / total) * 100 : 0}%`, background: '#22c55e' }}
                  />
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-1 bg-[#111] rounded-lg p-1 w-fit">
                {(['all', 'alive', 'dead'] as FilterMode[]).map(f => (
                  <button
                    key={f}
                    onClick={() => setFilter(f)}
                    className="px-3 py-1 rounded-md text-xs font-medium transition-colors capitalize"
                    style={filter === f
                      ? { background: f === 'alive' ? '#22c55e' : f === 'dead' ? '#ef4444' : '#333', color: f === 'all' ? '#fff' : '#000' }
                      : { color: '#6b7280' }
                    }
                  >
                    {f} {f === 'alive' ? `(${aliveCount})` : f === 'dead' ? `(${deadCount})` : `(${total})`}
                  </button>
                ))}
              </div>

              {/* Results table */}
              <div className="overflow-x-auto rounded-xl border border-[#1a1a1a]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[#1a1a1a] text-[#6b7280] text-xs font-mono">
                      <th className="text-left px-4 py-2.5">Proxy</th>
                      <th className="text-left px-3 py-2.5">Status</th>
                      <th className="text-left px-3 py-2.5">Exit IP</th>
                      <th className="text-left px-3 py-2.5">Latency</th>
                      <th className="text-left px-3 py-2.5">Location</th>
                      <th className="text-left px-3 py-2.5">ISP</th>
                      <th className="text-left px-3 py-2.5">Anonymity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {visibleResults.map((r, i) => (
                      <tr
                        key={r.id}
                        className="border-b border-[#111] hover:bg-[#0f0f0f] transition-colors"
                        style={{ background: i % 2 === 0 ? 'transparent' : '#0a0a0a' }}
                      >
                        <td className="px-4 py-2.5 font-mono text-xs text-[#9ca3af] max-w-[180px] truncate">{r.raw}</td>
                        <td className="px-3 py-2.5">
                          <span
                            className="flex items-center gap-1.5 text-xs font-mono"
                            style={{
                              color: r.status === 'alive' ? '#22c55e'
                                : r.status === 'dead' ? '#ef4444'
                                : r.status === 'testing' ? '#f59e0b'
                                : '#6b7280',
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{
                                background: r.status === 'alive' ? '#22c55e'
                                  : r.status === 'dead' ? '#ef4444'
                                  : r.status === 'testing' ? '#f59e0b'
                                  : '#2a2a2a',
                              }}
                            />
                            {r.status === 'testing' ? 'Testing' : r.status === 'alive' ? 'Alive' : r.status === 'dead' ? 'Dead' : '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 font-mono text-xs text-white">{r.ip ?? '—'}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-white">
                          {r.ms != null ? `${r.ms} ms` : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#9ca3af]">
                          {r.country ? (
                            <span>
                              <FlagEmoji code={r.countryCode} />
                              {r.city ? `${r.city}, ` : ''}{r.country}
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-3 py-2.5 text-xs text-[#9ca3af] max-w-[140px] truncate">{r.isp ?? '—'}</td>
                        <td className="px-3 py-2.5"><AnonBadge level={r.anonymity} /></td>
                      </tr>
                    ))}
                    {visibleResults.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-xs text-[#3a3a3a] font-mono">
                          No results yet
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
