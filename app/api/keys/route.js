import { NextResponse } from 'next/server'
import {
  getKeys,
  setKeys,
  recordAttempt,
  isLocked,
  safeEqual,
  clientIp,
} from '@/lib/server/vault'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ADMIN_PASSCODE = process.env.ADMIN_PASSCODE || '12345678'

const guard = async (request) => {
  if (await isLocked()) {
    return NextResponse.json(
      { error: 'Endpoint is locked. Try again in up to an hour.' },
      { status: 423 },
    )
  }
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }
  const ip = clientIp(request)
  const ok = safeEqual(body?.passcode, ADMIN_PASSCODE)
  const state = await recordAttempt(ip, ok)
  if (!ok) {
    if (state.locked) {
      return NextResponse.json(
        { error: 'Endpoint is now locked due to too many failed attempts. Try again in an hour.' },
        { status: 423 },
      )
    }
    const remaining = Math.max(0, 10 - (state.attempts[ip]?.length || 0))
    return NextResponse.json(
      { error: 'Wrong passcode.', attemptsRemaining: remaining },
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
