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

const MAX_FAILS = 10
const RATE_DEFAULT = { fails: 0, locked: false, lockedPasscode: null }

// Reads state and auto-clears the lock when the admin has rotated
// ADMIN_PASSCODE in Netlify (i.e. the env var no longer matches the value
// that was active when the lock tripped).
const readAndMaybeUnlock = async (currentPasscode) => {
  const state = await readBlob(RATE_BLOB, RATE_DEFAULT)
  if (state.locked && state.lockedPasscode && state.lockedPasscode !== currentPasscode) {
    state.locked = false
    state.lockedPasscode = null
    state.fails = 0
    await writeBlob(RATE_BLOB, state)
  }
  return state
}

export const getRateState = (currentPasscode) => readAndMaybeUnlock(currentPasscode)

export const recordAttempt = async (currentPasscode, success) => {
  const state = await readAndMaybeUnlock(currentPasscode)
  if (state.locked) return state

  if (success) {
    state.fails = 0
    await writeBlob(RATE_BLOB, state)
    return state
  }

  state.fails = (state.fails || 0) + 1
  if (state.fails >= MAX_FAILS) {
    state.locked = true
    state.lockedPasscode = currentPasscode
  }
  await writeBlob(RATE_BLOB, state)
  return state
}

export const isLocked = async (currentPasscode) => {
  const state = await readAndMaybeUnlock(currentPasscode)
  return !!state.locked
}

export const MAX_FAILED_ATTEMPTS = MAX_FAILS

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

