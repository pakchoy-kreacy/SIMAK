import { NextResponse } from 'next/server'
import { getStaffSession } from '@/lib/auth/staff'

export async function GET() {
  const session = await getStaffSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return NextResponse.json(session)
}
