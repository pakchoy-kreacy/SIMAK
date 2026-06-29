// ============================================================
// app/login/page.tsx
// Halaman login — orang tua (NISN) dan staff (email+password)
// ============================================================

import { redirect }    from 'next/navigation'
import { getParentSession } from '@/lib/auth/parent'
import { getStaffSession }  from '@/lib/auth/staff'
import { LoginForm }        from './LoginForm'

export default async function LoginPage() {
  // Redirect jika sudah login
  const parentSession = await getParentSession()
  if (parentSession) redirect('/dashboard')

  const staffSession = await getStaffSession()
  if (staffSession) {
    if (staffSession.role === 'admin') redirect('/admin')
    redirect('/guru')
  }

  return <LoginForm />
}
