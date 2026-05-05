import { NextResponse } from 'next/server'
import {
  getKeys,
  setKeys,
  recordAttempt,
  getRateState,
  safeEqual,
  MAX_FAILED_ATTEMPTS,
} from '@/lib/server/vault'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE

const lockedResponse = () =>
  NextResponse.json(
    { error: 'Endpoint locked due to too many wrong attempts. The admin must rotate ADMIN_PASSCODE in Netlify to unlock.' },
    { status: 423 },
  )

const guard = async (request) => {
  if (!ADMIN_PASSCODE) {
    return NextResponse.json(
      { error: 'Server is missing ADMIN_PASSCODE env var.' },
      { status: 500 },
    )
  }

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  // Pre-flight check: bail without consuming an attempt if already locked.
  const pre = await getRateState(ADMIN_PASSCODE)
  if (pre.locked) return lockedResponse()

  const ok = safeEqual(body?.passcode, ADMIN_PASSCODE)
  // Single read-modify-write — returns the post-write state so the
  // attemptsRemaining we surface always matches what we just persisted.
  const state = await recordAttempt(ADMIN_PASSCODE, ok)

  if (!ok) {
    if (state.locked) return lockedResponse()
    const attemptsRemaining = Math.max(0, MAX_FAILED_ATTEMPTS - (state.fails || 0))
    return NextResponse.json(
      { error: 'Wrong passcode.', attemptsRemaining },
      { status: 401 },
    )
  }
  return { body }
}

export async function POST(request) {
  const result = await guard(request)
  if (result instanceof NextResponse) return result
  const keys = await getKeys()
  return NextResponse.json({ keys })
}

export async function PUT(request) {
  const result = await guard(request)
  if (result instanceof NextResponse) return result
  const incoming = result.body?.keys
  if (!incoming || typeof incoming !== 'object') {
    return NextResponse.json({ error: 'Missing keys object.' }, { status: 400 })
  }
  const saved = await setKeys(incoming)
  return NextResponse.json({ keys: saved })
}
