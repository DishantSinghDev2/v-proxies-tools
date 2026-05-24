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
  <img src="https://img.shields.io/badge/Render-Node.js-46E3B7?style=flat-square&logo=render&logoColor=white" alt="Render" />
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

- **End-to-end encrypted credentials** — proxy usernames and passwords are encrypted in the browser before leaving your device; nothing is ever logged in plaintext
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

## Security — End-to-End Encrypted Credentials

Proxy credentials (username + password) are encrypted **in the browser** before the request leaves your device, using **ECDH P-256 + AES-256-GCM**.

```
Browser                          Cloudflare Worker              Node.js Backend
───────                          ─────────────────              ───────────────
Generate ephemeral ECDH keypair
Derive shared secret (ECDH)
Encrypt {host,port,user,pass}
  → AES-256-GCM ciphertext  ──►  Forward encrypted blob  ──►  Decrypt in memory
                                  (never sees plaintext)        Run proxy test
                             ◄──  Return test result      ◄──  Discard credentials
```

**Guarantees:**
- Cloudflare edge only ever handles the encrypted envelope — credentials are unreadable even in CF request logs
- The Node.js backend decrypts in memory for the duration of the test, then discards — no writes to disk or logs
- A fresh ephemeral keypair is generated per request, so no two requests share a key
- If the backend is unreachable, the Cloudflare Worker decrypts and falls back to `cloudflare:sockets` using its own Wrangler secret — credentials never travel in plaintext at any hop

The key pair is generated once by the operator (`npm run generate-keys` in `proxy-backend/`) and stored as a Wrangler secret + backend `.env`. See [`proxy-backend/README.md`](proxy-backend/README.md) for setup instructions.

---

## Architecture

```
Browser  ──HTTPS──►  Next.js on Render (Node.js)
(encrypted blob)       /api/proxy-test
                         Decrypt in memory → testProxy()
                         undici ProxyAgent / SOCKS
                              │
                              ▼
                        ip-api.com  +  httpbin.org / postman-echo.com
```

Everything runs in a single Next.js app deployed on Render. No separate services, no edge runtime.

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

> **Note:** Encryption is disabled in local dev unless you add keys to `.env.local`. The tool falls back to plaintext automatically — fine for development.

### Deploy to Cloudflare Workers

```bash
npm run build:worker   # Next.js build + OpenNext bundle
wrangler deploy        # deploy to Cloudflare Workers
```

Or use the combined command:

```bash
npm run deploy
```

### Deploy to Render

1. Create a new **Web Service** on [render.com](https://render.com), connect this repo
2. Set **Root Directory** to ` ` (repo root)
3. **Build command:** `npm install && npm run build`
4. **Start command:** `npm run start`
5. Add environment variables:
   - `ECDH_PRIVATE_KEY_JWK` — from key generation below
   - `ECDH_PUBLIC_KEY_B64` — from key generation below

### Generate encryption keys

```bash
node -e "
const { webcrypto } = require('node:crypto');
(async () => {
  const pair = await webcrypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey']);
  const priv = await webcrypto.subtle.exportKey('jwk', pair.privateKey);
  const pub = await webcrypto.subtle.exportKey('raw', pair.publicKey);
  console.log('ECDH_PRIVATE_KEY_JWK=' + JSON.stringify(JSON.stringify(priv)));
  console.log('ECDH_PUBLIC_KEY_B64=' + Buffer.from(pub).toString('base64'));
})();
"
```

Add both values to Render's environment variables.

---

## Tech Stack

| | |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router) |
| Runtime | Node.js 18+ on [Render](https://render.com) |
| Proxy testing | [undici](https://undici.nodejs.org) `ProxyAgent` + [socks](https://github.com/JoshGlazebrook/socks) |
| Encryption | ECDH P-256 + AES-256-GCM (Web Crypto API) |
| Styling | Tailwind CSS v4 |
| IP Geo | [ip-api.com](https://ip-api.com) |
| Anonymity check | [httpbin.org](https://httpbin.org/headers) + [postman-echo.com](https://postman-echo.com/headers) |

---

## Project Structure

```
app/
  page.tsx                        # tools home / grid
  layout.tsx                      # nav, footer, metadata
  globals.css
  lib/
    crypto.ts                     # ECDH + AES-256-GCM decryption
    tester.ts                     # proxy testing (undici ProxyAgent + SOCKS)
  api/
    public-key/route.ts           # serves the ECDH public key to the browser
    proxy-test/route.ts           # proxy test endpoint
    proxy-judge/route.ts          # header mirror for anonymity detection
  tools/
    proxy-tester/
      page.tsx                    # SEO page wrapper + FAQ
      ProxyTesterTool.tsx         # bulk + single tester UI (client-side encryption)
public/
  logo.svg
next.config.ts
```

---

## Scripts

```bash
npm run dev      # local dev server (Next.js, Turbopack)
npm run build    # production build
npm run start    # start production server
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
