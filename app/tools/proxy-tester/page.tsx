import type { Metadata } from 'next'
import ProxyTesterTool from './ProxyTesterTool'

export const metadata: Metadata = {
  title: 'Proxy Tester — Free Online Proxy Checker',
  description:
    'Test HTTP, SOCKS4, and SOCKS5 proxies in bulk. Check proxy speed, anonymity level, exit IP, geolocation, and ISP. Free proxy checker tool with no limits.',
  keywords: [
    'proxy tester', 'proxy checker', 'proxy server checker', 'socks proxy checker',
    'bulk proxy tester', 'free proxy checker', 'proxy anonymity checker',
    'check proxy speed', 'proxy ip checker',
  ],
  openGraph: {
    title: 'Free Proxy Tester & Checker — v-proxies Tools',
    description: 'Test HTTP, SOCKS4, and SOCKS5 proxies in bulk. Check speed, anonymity, and geolocation instantly.',
    url: 'https://tools.vproxies.app/tools/proxy-tester',
    type: 'website',
  },
  alternates: { canonical: 'https://tools.vproxies.app/tools/proxy-tester' },
}

const FAQ = [
  {
    q: 'What is a proxy tester?',
    a: 'A proxy tester is a tool that checks whether a proxy server is working by routing a test request through it and measuring the response time, exit IP address, location, and anonymity level.',
  },
  {
    q: 'How do I test if my proxy is working?',
    a: 'Enter your proxy\'s host and port (and optionally username/password) into the single tester and click "Test Proxy". The tool will connect through your proxy and show you the exit IP, latency, and anonymity level within seconds.',
  },
  {
    q: 'What proxy formats are supported?',
    a: 'The tool supports HTTP, HTTPS, SOCKS4, and SOCKS5 proxies. In bulk mode, you can paste proxies in any of these formats: host:port, host:port:user:pass, user:pass@host:port, or with a protocol prefix like http:// or socks5://',
  },
  {
    q: 'What does anonymity level mean?',
    a: 'Elite (high anonymity) proxies don\'t reveal that you\'re using a proxy at all. Anonymous proxies tell the server a proxy is in use but hide your real IP. Transparent proxies forward your real IP to the destination — offering no privacy.',
  },
  {
    q: 'Why is the proxy showing my own IP?',
    a: 'This usually means the proxy is transparent or the connection failed silently. Some proxies only work with specific protocols or require authentication. Try testing with credentials and ensure the proxy supports HTTPS (CONNECT tunneling).',
  },
  {
    q: 'How many proxies can I test at once?',
    a: 'There is no hard limit on the number of proxies in bulk mode. You can adjust the thread count (concurrency) from 1 to 50 to control how many are tested simultaneously. Adding a delay between requests helps if you\'re using rotating proxies.',
  },
  {
    q: 'Why use a delay between proxy tests?',
    a: 'When testing rotating proxies (like residential or mobile pools), all concurrent requests may hit the same exit node. Adding a delay of 1–5 seconds forces the pool to rotate and assign different IPs, giving more accurate results.',
  },
  {
    q: 'Is this tool free?',
    a: 'Yes — completely free with no sign-up required. The proxy tester runs server-side so your real IP is never exposed during testing.',
  },
]

const faqSchema = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQ.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

export default function ProxyTesterPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />

      <main className="flex-1 w-full max-w-5xl mx-auto px-4 md:px-6 py-10 md:py-16">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-[#6b7280] font-mono mb-4">
            <a href="/" className="hover:text-white transition-colors">Tools</a>
            <span>/</span>
            <span className="text-[#9ca3af]">Proxy Tester</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            Free Proxy Tester
          </h1>
          <p className="text-[#9ca3af] text-sm md:text-base max-w-2xl">
            Test HTTP, SOCKS4 &amp; SOCKS5 proxies in bulk. Check exit IP, latency, geolocation, ISP, and anonymity level — all server-side so your real IP stays private.
          </p>
        </div>

        {/* Tool */}
        <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-2xl p-4 md:p-6 mb-12">
          <ProxyTesterTool />
        </div>

        {/* Get better proxies CTA */}
        <div className="mb-12 p-5 rounded-xl border border-[#22c55e30] bg-[#22c55e08] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white mb-0.5">Need reliable proxies that actually pass?</p>
            <p className="text-xs text-[#9ca3af]">196+ countries · 99.97% uptime · from $0.99/GB · residential &amp; mobile IPs</p>
          </div>
          <a
            href="https://v-proxies.com/residential"
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: '#22c55e', color: '#000' }}
          >
            Get Residential →
          </a>
        </div>

        {/* SEO content */}
        <div className="prose prose-invert max-w-none">
          <h2 className="text-xl font-bold text-white mb-4">What is a Proxy Checker?</h2>
          <p className="text-[#9ca3af] text-sm leading-relaxed mb-6">
            A <strong className="text-white">proxy checker</strong> (also called a proxy tester or proxy server checker) is a tool that verifies whether a proxy server is functional, measures its response speed, and reveals key details about the connection — including the exit IP address, geographic location, internet service provider (ISP), and anonymity level.
          </p>
          <p className="text-[#9ca3af] text-sm leading-relaxed mb-6">
            When you send traffic through a proxy, the destination website sees the proxy&apos;s IP address instead of yours. A proxy tester confirms this is actually happening and that the proxy isn&apos;t leaking your real IP address — which is what determines the <strong className="text-white">anonymity level</strong>.
          </p>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">How to Use the Proxy Tester</h2>
          <div className="space-y-3 mb-6">
            {[
              { step: '1', title: 'Choose Single or Bulk mode', desc: 'Use Single mode to test one proxy with detailed output. Use Bulk mode to paste a list and test them all simultaneously.' },
              { step: '2', title: 'Enter your proxies', desc: 'Supported formats: host:port, host:port:user:pass, user:pass@host:port, or prefixed with http://, socks4://, or socks5://' },
              { step: '3', title: 'Configure settings', desc: 'Set the number of threads (concurrent tests), timeout in seconds, and optionally a delay between tests for rotating proxy pools.' },
              { step: '4', title: 'Run and filter', desc: 'Click Test All and watch results populate in real time. Filter by Alive or Dead, then export working proxies as TXT or CSV.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="flex gap-4">
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                  style={{ background: '#22c55e20', color: '#22c55e', border: '1px solid #22c55e40' }}
                >
                  {step}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-[#9ca3af] mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Understanding Proxy Anonymity Levels</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            {[
              {
                level: 'Elite',
                color: '#22c55e',
                desc: 'Also called "high anonymity" proxies. The destination server cannot tell a proxy is being used — no proxy-related headers are forwarded.',
              },
              {
                level: 'Anonymous',
                color: '#3b82f6',
                desc: 'The server knows a proxy is in use (via headers like "Via") but your real IP address is not revealed.',
              },
              {
                level: 'Transparent',
                color: '#f59e0b',
                desc: 'The server can see both that a proxy is in use AND your real IP via X-Forwarded-For. Provides no privacy.',
              },
            ].map(({ level, color, desc }) => (
              <div key={level} className="p-4 rounded-xl border" style={{ borderColor: `${color}30`, background: `${color}08` }}>
                <p className="text-sm font-bold mb-1" style={{ color }}>{level}</p>
                <p className="text-xs text-[#9ca3af] leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Supported Proxy Formats</h2>
          <div className="bg-[#0f0f0f] border border-[#1a1a1a] rounded-xl p-4 mb-6 font-mono text-xs space-y-1.5">
            {[
              '192.168.1.1:8080',
              '192.168.1.1:8080:username:password',
              'username:password@192.168.1.1:8080',
              'http://192.168.1.1:8080',
              'http://username:password@192.168.1.1:8080',
              'socks4://192.168.1.1:1080',
              'socks5://username:password@192.168.1.1:1080',
            ].map(f => (
              <div key={f} className="text-[#22c55e]">{f}</div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Why Test Proxies Server-Side?</h2>
          <p className="text-[#9ca3af] text-sm leading-relaxed mb-4">
            Browser-based proxy testers have a fundamental limitation: browsers cannot route arbitrary HTTP requests through an external proxy server via JavaScript. The only way to truly test a proxy is to make the request from a server that can be configured to use that proxy.
          </p>
          <p className="text-[#9ca3af] text-sm leading-relaxed mb-6">
            Our tool runs all proxy tests server-side using Node.js with <strong className="text-white">CONNECT tunneling</strong> (via HTTPS targets). This ensures the proxy is actually being used for the test traffic — not bypassed. Your real IP is never part of the test request.
          </p>

          <h2 className="text-xl font-bold text-white mb-4 mt-8">Tips for Accurate Results</h2>
          <ul className="space-y-2 mb-8 text-sm text-[#9ca3af]">
            {[
              'Use HTTPS targets (which we do by default) to force CONNECT tunneling — HTTP requests can bypass the proxy agent in some configurations.',
              'For rotating proxy pools, add a delay of 1–2 seconds between tests to allow the pool to assign different exit nodes.',
              'If proxies time out, try increasing the timeout. Residential and mobile proxies often have higher latency than datacenter proxies.',
              'Set threads to 1 when testing rotating proxies if you want to guarantee sequential rotation.',
              'Export alive proxies as TXT to get a clean list ready to use in your tools or bots.',
            ].map(tip => (
              <li key={tip} className="flex gap-2">
                <span className="text-[#22c55e] flex-shrink-0 mt-0.5">›</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>

          {/* FAQ */}
          <h2 className="text-xl font-bold text-white mb-6 mt-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group border border-[#1a1a1a] rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 cursor-pointer text-sm font-medium text-white hover:bg-[#0f0f0f] transition-colors list-none">
                  {q}
                  <span className="text-[#6b7280] group-open:rotate-180 transition-transform text-lg leading-none ml-2">›</span>
                </summary>
                <div className="px-4 pb-4 pt-0 text-sm text-[#9ca3af] leading-relaxed border-t border-[#1a1a1a]">
                  <div className="pt-3">{a}</div>
                </div>
              </details>
            ))}
          </div>
        </div>
      </main>
    </>
  )
}
