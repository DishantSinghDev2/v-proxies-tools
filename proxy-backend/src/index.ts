import 'dotenv/config'
import Fastify from 'fastify'
import helmet from '@fastify/helmet'
import { loadPrivateKey, decryptPayload } from './crypto.js'
import { testProxy } from './tester.js'

const { ECDH_PRIVATE_KEY_JWK, ECDH_PUBLIC_KEY_B64, BACKEND_TOKEN, PORT = '3001' } = process.env

if (!ECDH_PRIVATE_KEY_JWK || !ECDH_PUBLIC_KEY_B64 || !BACKEND_TOKEN) {
  console.error('Missing required env vars. Copy .env.example to .env and fill in the values.')
  process.exit(1)
}

const serverPrivKey = await loadPrivateKey(ECDH_PRIVATE_KEY_JWK)

const fastify = Fastify({
  logger: {
    level: 'info',
    serializers: {
      req: req => ({ method: req.method, url: req.url }),
      res: res => ({ statusCode: res.statusCode }),
    },
  },
})

await fastify.register(helmet, { contentSecurityPolicy: false })

fastify.addHook('onRequest', async (req, reply) => {
  if (req.url === '/health') return
  if (req.headers.authorization !== `Bearer ${BACKEND_TOKEN}`) {
    await reply.code(401).send({ ok: false, error: 'Unauthorized' })
  }
})

fastify.get('/health', async () => ({ ok: true }))

fastify.get('/public-key', async () => ({ publicKey: ECDH_PUBLIC_KEY_B64 }))

interface TestBody {
  epk: string
  iv: string
  ct: string
  timeout?: number
}

fastify.post<{ Body: TestBody }>('/test', {
  schema: {
    body: {
      type: 'object',
      required: ['epk', 'iv', 'ct'],
      properties: {
        epk: { type: 'string' },
        iv: { type: 'string' },
        ct: { type: 'string' },
        timeout: { type: 'number' },
      },
    },
  },
}, async (req, reply) => {
  const { epk, iv, ct, timeout = 15000 } = req.body

  let plaintext: string
  try {
    plaintext = await decryptPayload(epk, iv, ct, serverPrivKey)
  } catch {
    return reply.code(400).send({ ok: false, error: 'Decryption failed' })
  }

  let parsed: { host: string; port: number; username?: string; password?: string; protocol?: 'http' | 'socks4' | 'socks5' }
  try {
    parsed = JSON.parse(plaintext) as typeof parsed
  } catch {
    return reply.code(400).send({ ok: false, error: 'Invalid payload' })
  }

  const { host, port, username, password, protocol = 'http' } = parsed
  if (!host || !port) return reply.code(400).send({ ok: false, error: 'Missing host or port' })

  return testProxy(host, port, username, password, timeout, protocol)
})

await fastify.listen({ port: parseInt(PORT, 10), host: '0.0.0.0' })
