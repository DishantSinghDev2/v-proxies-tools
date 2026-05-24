#!/usr/bin/env node
import { webcrypto } from 'node:crypto'
const { subtle } = webcrypto

const pair = await subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveKey'])
const privateJwk = await subtle.exportKey('jwk', pair.privateKey)
const publicRaw = await subtle.exportKey('raw', pair.publicKey)
const publicB64 = Buffer.from(publicRaw).toString('base64')

console.log('\n=== ECDH P-256 Key Pair (run once, keep both safe) ===\n')
console.log('Copy these into proxy-backend/.env AND your wrangler secrets:\n')
console.log(`ECDH_PRIVATE_KEY_JWK=${JSON.stringify(JSON.stringify(privateJwk))}`)
console.log(`ECDH_PUBLIC_KEY_B64=${publicB64}`)
console.log('\nFor Cloudflare Workers, add the private key as a secret:')
console.log('  echo \'<paste ECDH_PRIVATE_KEY_JWK value>\' | wrangler secret put ECDH_PRIVATE_KEY_JWK')
console.log('\nFor the public key (non-secret), add to wrangler.toml [vars]:')
console.log(`  ECDH_PUBLIC_KEY_B64 = "${publicB64}"\n`)
