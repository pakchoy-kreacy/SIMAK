'use client'

import { useState, useEffect } from 'react'
import type { StaffRole } from '@/lib/types/app'

interface SessionData {
  userId: string
  email:  string
  nama:   string
  role:   StaffRole
  roles:  StaffRole[]
}

export function useSession() {
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const cached = sessionStorage.getItem('simak-staff-session')
    if (cached) {
      try {
        setSession(JSON.parse(cached))
      } catch {}
    }
    setLoading(false)
  }, [])

  return { session, loading }
}
