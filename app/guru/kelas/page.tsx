'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from '@/lib/auth/session-context'
import { WaliKelasClient } from '@/components/wali-kelas/WaliKelasClient'

export default function GuruKelasPage() {
  const session = useSession()
  const router = useRouter()

  useEffect(() => {
    if (session && session.role === 'admin') router.push('/admin')
  }, [session, router])

  if (!session) return null

  return <WaliKelasClient namaGuru={session.nama} detailPath="/guru/kelas" />
}
