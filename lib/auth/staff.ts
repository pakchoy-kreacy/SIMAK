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

    // Single query with join: user_profile + user_roles (3 queries → 1)
    const { data: profile, error: profileError } = await supabase
      .from('user_profile')
      .select('nama, role, is_active, user_roles: user_roles(role)')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_active) return null

    const primaryRole = profile.role as StaffRole
    const extraRoles = (profile as unknown as { user_roles: { role: string }[] | null }).user_roles ?? []

    const roleSet = new Set<StaffRole>([primaryRole])
    for (const r of extraRoles) {
      if (['wali_kelas', 'guru_tahfiz', 'guru_wafa'].includes(r.role)) {
        roleSet.add(r.role as StaffRole)
      }
    }

    return {
      userId: user.id,
      email:  user.email ?? '',
      nama:   profile.nama,
      role:   primaryRole,
      roles:  Array.from(roleSet),
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
