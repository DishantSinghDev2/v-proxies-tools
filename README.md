<p align="center">
  <img src="public/logo.svg" width="80" alt="v-proxies Tools" />
</p>

<h1 align="center">v-proxies Tools</h1>

<p align="center">
  Free, server-side proxy tools — proxy tester, IP checker, DNS leak test and more. No sign-up, no rate limits.
</p>

<p align="center">
  <a href="https://v-proxies.com?utm_source=github&utm_medium=readme&utm_campaign=v_proxies_tools&ref=github">
    <img src="https://img.shields.io/badge/Powered%20by-v--proxies-22c55e?style=flat-square&logo=data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cGF0aCBkPSJNMTIgMjJzOC00IDgtMTBWNWwtOC0zLTggM3Y3YzAgNiA4IDEwIDggMTB6IiBmaWxsPSIjMjJjNTVlIi8+PC9zdmc+" alt="v-proxies" />
  </a>
  <a href="https://github.com/DishantSinghDev2/v-proxies-tools">
    <img src="https://img.shields.io/badge/open%20source-MIT-22c55e?style=flat-square" alt="Open Source" />
  </a>
  <img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/Cloudflare-Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white" alt="Cloudflare Workers" />
</p>

---

## ✦ What is this?

**v-proxies Tools** is an open-source collection of free, server-side network and proxy utilities. Every test runs on the server — your real IP is never exposed during testing.

Built to complement **[v-proxies](https://v-proxies.com?utm_source=github&utm_medium=readme&utm_campaign=v_proxies_tools&ref=github)** — residential, datacenter, and mobile proxies starting at **$0.99/GB** with a **free trial**.

Also check out the **[VP Proxy Switcher](https://github.com/DishantSinghDev2/vp-proxy-switcher)** — a Chrome extension to manage, rotate, and test proxies right from your browser.

---

## Tools

| Tool | Status | Description |
|---|---|---|
| **Proxy Tester** | ✅ Live | Test HTTP proxies in bulk — exit IP, latency, geo, ISP, anonymity level |
| **What Is My IP** | 🔜 Soon | See your public IP, ISP, and location |
| **DNS Leak Test** | 🔜 Soon | Check if DNS requests leak outside your proxy or VPN |
| **IP Lookup** | 🔜 Soon | Detailed info on any IP — location, ASN, abuse records |
| **User Agent Checker** | 🔜 Soon | Inspect your browser's user agent string |
| **Port Scanner** | 🔜 Soon | Scan open ports on any host or proxy server |
| **HTTP Headers Inspector** | 🔜 Soon | See exact headers your proxy or browser sends |
| **Proxy Speed Test** | 🔜 Soon | Measure throughput through your proxy |

---

## Features

- **Server-side testing** — proxy requests never touch your machine; your real IP stays private
- **Bulk proxy tester** — paste any number of proxies, configure threads (1–50), timeout, and delay
- **All common formats** — `host:port`, `host:port:user:pass`, `user:pass@host:port`, `http://`, `socks4://`, `socks5://`
- **Anonymity detection** — Elite / Anonymous / Transparent classification via header inspection
- **Live results** — results stream in as tests complete, with per-proxy status indicators
- **Export** — download alive proxies as TXT or CSV
- **No sign-up, no limits** — completely free, open source

---

## Proxy Tester — How It Works

The proxy tester connects to your proxy using raw TCP via **Cloudflare Workers' `cloudflare:sockets` API**, sends an HTTP/1.1 request through the proxy to an IP lookup service, and measures:

- **Exit IP** — the IP the destination server sees
- **Latency** — round-trip time through the proxy
- **Geolocation** — country, city, region
- **ISP** — the internet service provider of the exit node
- **Anonymity** — whether the proxy leaks your real IP or proxy-identifying headers

Because tests run on Cloudflare's edge network, results are consistent regardless of where you are.

---

## Get Started

### Live site

→ **[tools.vproxies.app](https://tools.vproxies.app)**

### Run locally

**Prerequisites:** Node.js 18+, npm

```bash
git clone https://github.com/DishantSinghDev2/v-proxies-tools.git
cd v-proxies-tools
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Cloudflare Workers

```bash
npm run build:worker   # Next.js build + OpenNext bundle
wrangler deploy        # deploy to Cloudflare Workers
```

Or use the combined command:

```bash
npm run deploy
```

---

## Tech Stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Adapter | [OpenNext for Cloudflare](https://opennext.js.org/cloudflare) |
| Runtime | [Cloudflare Workers](https://workers.cloudflare.com) |
| TCP sockets | [`cloudflare:sockets`](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) |
| Styling | Tailwind CSS |
| IP Geo | [ip-api.com](https://ip-api.com) |
| Anonymity check | [httpbin.org](https://httpbin.org/headers) |

---

## Project Structure

```
app/
  page.tsx                        # tools home / grid
  layout.tsx                      # nav, footer, metadata
  globals.css
  api/
    proxy-test/route.ts           # proxy test endpoint (cloudflare:sockets)
    proxy-judge/route.ts          # header mirror for anonymity detection
  tools/
    proxy-tester/
      page.tsx                    # SEO page wrapper + FAQ
      ProxyTesterTool.tsx         # bulk + single tester UI
public/
  logo.svg
scripts/
  patch-cf-sockets.mjs            # postbuild patch for cloudflare:sockets imports
wrangler.toml
open-next.config.ts
```

---

## Scripts

```bash
npm run dev            # local dev server (Next.js, Turbopack)
npm run build          # Next.js production build
npm run build:worker   # full Cloudflare Workers build (Next + OpenNext)
npm run preview        # build + run with wrangler dev
npm run deploy         # build + wrangler deploy
```

---

## Get Proxies — $0.99/GB · Free Trial

v-proxies Tools is designed to work with **[v-proxies](https://v-proxies.com?utm_source=github&utm_medium=readme&utm_campaign=v_proxies_tools&ref=github)**:

- Residential, datacenter, and mobile proxies
- 195+ countries · rotating and sticky sessions
- No monthly commitment — pay per GB
- **Starting at $0.99/GB** · **Free trial available**

→ [Get started at v-proxies.com](https://v-proxies.com?utm_source=github&utm_medium=readme&utm_campaign=v_proxies_tools&ref=github)

---

## Also Try

**[VP Proxy Switcher](https://github.com/DishantSinghDev2/vp-proxy-switcher)** — Chrome extension to manage, rotate, and test proxies. One-click switching, bulk import, auto-rotate, latency indicator, and user agent spoofing.

---

## License

MIT © [v-proxies.com](https://v-proxies.com?utm_source=github&utm_medium=readme&utm_campaign=v_proxies_tools&ref=github)
