// ============================================================
// lib/auth/staff.ts
// Helper untuk autentikasi staff via Supabase Auth
// ============================================================

import { createServerClient }   from '@/lib/supabase/server'
import type { StaffSessionData, StaffRole } from '@/lib/types/app'

// -----------------------------------------------------------
// getStaffSession
// Ambil session staff dari Supabase Auth + role dari user_profile
// -----------------------------------------------------------
export async function getStaffSession(): Promise<StaffSessionData | null> {
  try {
    const supabase = await createServerClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return null

    // Query 1: Get profile (fast, indexed by id)
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('nama, role, is_active')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_active) return null

    const primaryRole = profile.role as StaffRole
    let allRoles: StaffRole[] = [primaryRole]

    // Query 2: Get extra roles (graceful fallback if table missing)
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
    } catch {
      // user_roles table might not exist yet — fallback to primary role
    }

    return {
      userId: user.id,
      email:  user.email ?? '',
      nama:   profile.nama,
      role:   primaryRole,
      roles:  allRoles,
    }
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
