// ============================================================
// app/login/page.tsx
// Halaman login — orang tua (NISN) dan staff (email+password)
// ============================================================

import { redirect }          from 'next/navigation'
import { getParentSession }   from '@/lib/auth/parent'
import { getStaffSession }    from '@/lib/auth/staff'
import { createServerClient } from '@/lib/supabase/server'
import { LoginForm }          from './LoginForm'

export default async function LoginPage() {
  // Redirect jika sudah login (orang tua)
  const parentSession = await getParentSession()
  if (parentSession) redirect('/dashboard')

  // Untuk staff, validasi dulu ke Supabase Auth, jangan percaya cookie doang
  const staffSession = await getStaffSession()
  if (staffSession) {
    const supabase = await createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      if (staffSession.role === 'admin') redirect('/admin')
      redirect('/guru')
    }
  }

  return <LoginForm />
}
