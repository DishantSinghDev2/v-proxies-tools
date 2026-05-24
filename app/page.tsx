import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Free Proxy Tools — Proxy Tester, IP Checker & More',
  description:
    'Free online proxy tools: proxy tester, IP checker, DNS leak test, user agent checker and more. No sign-up required.',
}

const TOOLS = [
  {
    name: 'Proxy Tester',
    description: 'Test HTTP, SOCKS4 & SOCKS5 proxies in bulk. Check speed, exit IP, geolocation, ISP, and anonymity level.',
    href: '/tools/proxy-tester',
    status: 'live' as const,
    icon: '⚡',
    keywords: ['bulk', 'anonymity', 'latency', 'geolocation'],
  },
  {
    name: 'What Is My IP',
    description: 'See your public IP address, ISP, and location. Works with and without a proxy.',
    href: '/tools/my-ip',
    status: 'soon' as const,
    icon: '🌐',
    keywords: ['IPv4', 'IPv6', 'location'],
  },
  {
    name: 'DNS Leak Test',
    description: 'Check if your DNS requests are leaking outside your proxy or VPN tunnel.',
    href: '/tools/dns-leak',
    status: 'soon' as const,
    icon: '🔒',
    keywords: ['privacy', 'VPN', 'DNS'],
  },
  {
    name: 'IP Lookup',
    description: 'Look up detailed information about any IP address — location, ISP, ASN, and abuse records.',
    href: '/tools/ip-lookup',
    status: 'soon' as const,
    icon: '🔍',
    keywords: ['ASN', 'ISP', 'abuse'],
  },
  {
    name: 'User Agent Checker',
    description: 'Inspect your browser user agent string and see how you appear to websites.',
    href: '/tools/user-agent',
    status: 'soon' as const,
    icon: '🖥',
    keywords: ['browser', 'fingerprint'],
  },
  {
    name: 'Port Scanner',
    description: 'Scan open ports on a host or proxy server to verify reachability and service availability.',
    href: '/tools/port-scanner',
    status: 'soon' as const,
    icon: '📡',
    keywords: ['TCP', 'firewall', 'connectivity'],
  },
  {
    name: 'HTTP Headers Inspector',
    description: 'See the exact HTTP headers your proxy or browser sends to destination servers.',
    href: '/tools/headers',
    status: 'soon' as const,
    icon: '📋',
    keywords: ['anonymity', 'headers', 'requests'],
  },
  {
    name: 'Proxy Speed Test',
    description: 'Measure download and upload throughput through your proxy across multiple test endpoints.',
    href: '/tools/speed-test',
    status: 'soon' as const,
    icon: '🚀',
    keywords: ['bandwidth', 'speed', 'throughput'],
  },
]

export default function HomePage() {
  return (
    <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
      {/* Hero */}
      <div className="mb-12">
        <p className="text-xs font-mono text-[#22c55e] mb-3 tracking-widest uppercase">Free Tools</p>
        <h1 className="text-3xl md:text-4xl font-bold text-white mb-3">
          Proxy &amp; Network Tools
        </h1>
        <p className="text-[#9ca3af] text-base max-w-xl">
          Free, server-side tools for testing proxies, checking IPs, and diagnosing network privacy. No sign-up, no rate limits.
        </p>
      </div>

      {/* Tools grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {TOOLS.map(tool => (
          tool.status === 'live' ? (
            <Link
              key={tool.name}
              href={tool.href}
              className="group block p-5 rounded-2xl border border-[#1a1a1a] bg-[#0f0f0f] hover:border-[#22c55e40] hover:bg-[#0f0f0f] transition-all duration-200"
            >
              <ToolCard tool={tool} />
            </Link>
          ) : (
            <div
              key={tool.name}
              className="block p-5 rounded-2xl border border-[#141414] bg-[#0a0a0a] opacity-60 cursor-default"
            >
              <ToolCard tool={tool} />
            </div>
          )
        ))}
      </div>

      {/* CTA */}
      <div className="mt-16 p-6 rounded-2xl border border-[#22c55e20] bg-[#22c55e08] text-center">
        <p className="text-sm font-semibold text-white mb-1">Need proxies that actually work?</p>
        <p className="text-xs text-[#9ca3af] mb-4">196+ countries · 99.97% uptime · from $0.99/GB</p>
        <a
          href="https://v-proxies.com/residential"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-block px-5 py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: '#22c55e', color: '#000' }}
        >
          Get Residential Proxies →
        </a>
      </div>
    </main>
  )
}

function ToolCard({ tool }: { tool: typeof TOOLS[number] }) {
  return (
    <>
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{tool.icon}</span>
        {tool.status === 'live' ? (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider"
            style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e30' }}
          >
            Live
          </span>
        ) : (
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded uppercase tracking-wider bg-[#1a1a1a] text-[#6b7280]">
            Soon
          </span>
        )}
      </div>
      <h2 className="text-sm font-semibold text-white mb-1.5 group-hover:text-[#22c55e] transition-colors">
        {tool.name}
      </h2>
      <p className="text-xs text-[#6b7280] leading-relaxed mb-3">{tool.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {tool.keywords.map(k => (
          <span key={k} className="text-[10px] font-mono text-[#3a3a3a] bg-[#141414] px-1.5 py-0.5 rounded">
            {k}
          </span>
        ))}
      </div>
    </>
  )
}
