# proxy-backend

Node.js proxy testing backend for [v-proxies Tools](https://tools.vproxies.app). Handles proxy tests server-side so proxy credentials never pass through Cloudflare in plaintext.

The Cloudflare Worker (`/api/proxy-test`) forwards encrypted requests here. If this server is unreachable, the Worker falls back to its own `cloudflare:sockets` implementation — so this is optional but recommended for production.

---

## How it works

1. **Key generation** — You generate one ECDH P-256 keypair. The private key lives only in this server's `.env` and as a Wrangler secret. The public key is served to browsers via `/api/public-key`.
2. **Client encryption** — The browser generates an ephemeral keypair per request, derives a shared AES-256-GCM key via ECDH, and encrypts `{host, port, username, password}`. Only the encrypted blob (`epk`, `iv`, `ct`) travels over the network.
3. **Server decryption** — This server decrypts the payload in memory, tests the proxy, and returns results. Credentials are never logged anywhere.
4. **Zero-knowledge CF layer** — Cloudflare only ever sees the encrypted envelope. Even if CF logs the request body, credentials remain unreadable.

---

## Setup

### 1. Install dependencies

```bash
cd proxy-backend
npm install
```

### 2. Generate keys

```bash
npm run generate-keys
```

Copy the output into `proxy-backend/.env` and follow the instructions to add the keys to Cloudflare.

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with the generated keys and a random BACKEND_TOKEN
```

### 4. Run locally

```bash
npm run dev
```

Server starts at `http://localhost:3001`.

---

## Deploy with Docker

```bash
# Build and start
docker compose up -d

# View logs
docker compose logs -f

# Stop
docker compose down
```

The container exposes port `3001`. Put a reverse proxy (nginx, Caddy, Traefik) in front of it with TLS.

### Example nginx config

```nginx
server {
    listen 443 ssl;
    server_name proxy-backend.example.com;

    ssl_certificate     /etc/letsencrypt/live/proxy-backend.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/proxy-backend.example.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Connect to the Cloudflare Worker

After deploying, add to your Cloudflare Worker:

```bash
# Add the backend URL to wrangler.toml [vars]
# PROXY_BACKEND_URL = "https://proxy-backend.example.com"

# Add secrets via wrangler CLI
wrangler secret put PROXY_BACKEND_TOKEN
wrangler secret put ECDH_PRIVATE_KEY_JWK
```

Also add `ECDH_PUBLIC_KEY_B64` to `wrangler.toml [vars]` (it's not sensitive).

---

## API

All endpoints except `/health` require `Authorization: Bearer <BACKEND_TOKEN>`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check — `{ ok: true }` |
| `GET` | `/public-key` | Returns `{ publicKey: "<base64>" }` |
| `POST` | `/test` | Test a proxy (encrypted payload) |

### POST /test

**Request body:**
```json
{
  "epk": "<base64 ephemeral public key>",
  "iv":  "<base64 12-byte IV>",
  "ct":  "<base64 AES-256-GCM ciphertext>",
  "timeout": 15000
}
```

The `ct` field is AES-256-GCM encrypted JSON: `{"host":"...","port":8080,"username":"...","password":"..."}`.

**Response:**
```json
{
  "ok": true,
  "ip": "1.2.3.4",
  "ms": 342,
  "anonymity": "elite",
  "country": "US",
  "countryCode": "US",
  "city": "New York",
  "region": "New York",
  "isp": "ExampleNet Inc"
}
```

---

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ECDH_PRIVATE_KEY_JWK` | Yes | ECDH P-256 private key as JWK JSON string |
| `ECDH_PUBLIC_KEY_B64` | Yes | Corresponding public key as base64 raw bytes |
| `BACKEND_TOKEN` | Yes | Bearer token for auth (share with CF Worker) |
| `PORT` | No | Listen port (default: `3001`) |
