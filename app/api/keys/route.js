import { NextResponse } from 'next/server'
import {
  getKeys,
  setKeys,
  recordAttempt,
  isLocked,
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
  if (await isLocked(ADMIN_PASSCODE)) return lockedResponse()

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const ok = safeEqual(body?.passcode, ADMIN_PASSCODE)
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
