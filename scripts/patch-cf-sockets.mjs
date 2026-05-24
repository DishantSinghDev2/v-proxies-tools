#!/usr/bin/env node
// Wraps import("cloudflare:sockets") in a lambda so esbuild's static
// analyzer skips it. Without this, opennextjs-cloudflare's esbuild step
// errors because cloudflare:sockets is a Workers runtime module, not an
// npm package.  At runtime in Workers the call is identical.
import { readFileSync, writeFileSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import { join } from 'node:path'

const PATTERN = /import\("cloudflare:sockets"\)/g
const REPLACEMENT = '((m)=>import(m))("cloudflare:sockets")'
const cwd = process.cwd()

// Patch both the direct server output and the standalone copy
const searchDirs = [
  join(cwd, '.next', 'server'),
  join(cwd, '.next', 'standalone', '.next', 'server'),
]

let count = 0
for (const dir of searchDirs) {
  for await (const file of glob('**/*.js', { cwd: dir })) {
    const fullPath = join(dir, file)
    const src = readFileSync(fullPath, 'utf8')
    if (PATTERN.test(src)) {
      PATTERN.lastIndex = 0
      writeFileSync(fullPath, src.replace(PATTERN, REPLACEMENT))
      console.log(`  patched: ${file}`)
      count++
    }
  }
}
console.log(`patch-cf-sockets: ${count} file(s) patched.`)
