// Server-only key vault backed by Netlify Blobs.
// Falls back to an in-memory store when running outside Netlify (e.g. `next dev`)
// so local development keeps working without extra setup.

import { getStore } from '@netlify/blobs'

const STORE_NAME = 'keyvault'
const KEYS_BLOB = 'keys'
const RATE_BLOB = 'ratelimit'

const memory = { keys: null, rate: null }

const onNetlify = () =>
  !!(process.env.NETLIFY || process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY_SITE_ID)

const store = () => {
  if (!onNetlify()) return null
  try {
    return getStore(STORE_NAME)
  } catch {
    return null
  }
}

const readBlob = async (key, fallback) => {
  const s = store()
  if (!s) return memory[key === KEYS_BLOB ? 'keys' : 'rate'] ?? fallback
  try {
    const data = await s.get(key, { type: 'json' })
    return data ?? fallback
  } catch {
    return fallback
  }
}

const writeBlob = async (key, value) => {
  const s = store()
  if (!s) {
    memory[key === KEYS_BLOB ? 'keys' : 'rate'] = value
    return
  }
  await s.setJSON(key, value)
}

export const getKeys = async () => {
  const seeded = await readBlob(KEYS_BLOB, null)
  if (seeded) return seeded
  // First-time seed from env (only runs until something is written)
  const seedAnthropic = process.env.SEED_ANTHROPIC_KEY
  const initial = {}
  if (seedAnthropic) initial.anthropic = seedAnthropic
  await writeBlob(KEYS_BLOB, initial)
  return initial
}

export const setKeys = async (keys) => {
  const sanitized = {}
  for (const [provider, key] of Object.entries(keys || {})) {
    if (typeof key === 'string' && key.length > 0) sanitized[provider] = key
  }
  await writeBlob(KEYS_BLOB, sanitized)
  return sanitized
}

const RATE_DEFAULT = { attempts: {}, locked: false, lockedAt: null }
const LOCK_DURATION_MS = 60 * 60 * 1000 // Auto-expire the lock after 1 hour

// Reads the rate state and clears an expired lock if its hour has passed.
// Returns the (possibly cleared) state — caller is responsible for writing
// it back if they're already mutating.
const readAndExpire = async () => {
  const state = await readBlob(RATE_BLOB, RATE_DEFAULT)
  if (state.locked && state.lockedAt) {
    const lockedAtMs = Date.parse(state.lockedAt)
    if (!Number.isNaN(lockedAtMs) && Date.now() - lockedAtMs >= LOCK_DURATION_MS) {
      state.locked = false
      state.lockedAt = null
      state.attempts = {}
      await writeBlob(RATE_BLOB, state)
    }
  }
  return state
}

export const getRateState = async () => readAndExpire()

export const recordAttempt = async (ip, success) => {
  const state = await readAndExpire()
  if (state.locked) return state

  const now = Date.now()
  const hourAgo = now - 60 * 60 * 1000
  const list = (state.attempts[ip] || []).filter((t) => t > hourAgo)

  if (success) {
    // Successful auth clears the bucket for this IP
    delete state.attempts[ip]
    await writeBlob(RATE_BLOB, state)
    return state
  }

  list.push(now)
  state.attempts[ip] = list

  if (list.length > 10) {
    state.locked = true
    state.lockedAt = new Date(now).toISOString()
  }
  await writeBlob(RATE_BLOB, state)
  return state
}

export const isLocked = async () => {
  const state = await readAndExpire()
  return !!state.locked
}

// Constant-time string compare (avoids timing leaks on the passcode check)
export const safeEqual = (a, b) => {
  const sa = String(a ?? '')
  const sb = String(b ?? '')
  if (sa.length !== sb.length) return false
  let mismatch = 0
  for (let i = 0; i < sa.length; i++) {
    mismatch |= sa.charCodeAt(i) ^ sb.charCodeAt(i)
  }
  return mismatch === 0
}

export const clientIp = (request) => {
  const h = request.headers
  return (
    h.get('x-nf-client-connection-ip') ||
    h.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    h.get('x-real-ip') ||
    'unknown'
  )
}
