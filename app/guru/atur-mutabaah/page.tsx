import { redirect } from 'next/navigation'
import { getStaffSession } from '@/lib/auth/staff'
import { AturMutabaahClient } from './AturMutabaahClient'

export default async function AturMutabaahPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  return <AturMutabaahClient />
}
