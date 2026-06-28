// ============================================================
// lib/auth/staff.ts
// Helper untuk autentikasi staff via Supabase Auth
// Session cached in cookie by middleware — zero DB queries on read
// ============================================================

import { cookies }             from 'next/headers'
import { createServerClient }  from '@/lib/supabase/server'
import type { StaffSessionData, StaffRole } from '@/lib/types/app'

const SESSION_COOKIE = 'simak-session'

// -----------------------------------------------------------
// getStaffSession
// Read from cookie first (fast), fallback to DB (slow)
// -----------------------------------------------------------
export async function getStaffSession(): Promise<StaffSessionData | null> {
  // 1. Try cookie cache first (instant, set by middleware)
  try {
    const cookieStore = await cookies()
    const cached = cookieStore.get(SESSION_COOKIE)?.value
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed.userId && parsed.role && parsed.nama) {
        return {
          userId: parsed.userId,
          email:  parsed.email ?? '',
          nama:   parsed.nama,
          role:   parsed.role as StaffRole,
          roles:  (parsed.roles ?? [parsed.role]) as StaffRole[],
        }
      }
    }
  } catch {}

  // 2. Fallback: DB queries (only on first load or cookie expired)
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('nama, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_active) return null

    const primaryRole = profile.role as StaffRole
    let allRoles: StaffRole[] = [primaryRole]

    try {
      const { data: extraRoles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)

      if (extraRoles && extraRoles.length > 0) {
        const roleSet = new Set<StaffRole>([primaryRole])
        for (const r of extraRoles) {
          if (['wali_kelas', 'guru_tahfiz', 'guru_wafa'].includes(r.role)) {
            roleSet.add(r.role as StaffRole)
          }
        }
        allRoles = Array.from(roleSet)
      }
    } catch {}

    const sessionData = {
      userId: user.id,
      email:  user.email ?? '',
      nama:   profile.nama,
      role:   primaryRole,
      roles:  allRoles,
    }

    // Write to cookie for next time
    try {
      const cookieStore = await cookies()
      cookieStore.set(SESSION_COOKIE, JSON.stringify(sessionData), {
        httpOnly: false,
        secure:   process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path:     '/',
        maxAge:   3600,
      })
    } catch {}

    return sessionData
  } catch {
    return null
  }
}

// -----------------------------------------------------------
// requireStaffSession
// Throw jika tidak ada session staff
// -----------------------------------------------------------
export async function requireStaffSession(): Promise<StaffSessionData> {
  const session = await getStaffSession()
  if (!session) throw new Error('UNAUTHORIZED')
  return session
}

// -----------------------------------------------------------
// requireRole
// Pastikan staff punya role yang tepat
// -----------------------------------------------------------
export async function requireRole(
  allowedRoles: StaffRole[]
): Promise<StaffSessionData> {
  const session = await requireStaffSession()
  if (!allowedRoles.includes(session.role)) {
    throw new Error('FORBIDDEN')
  }
  return session
}
