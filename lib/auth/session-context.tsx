'use client'

import { createContext, useContext } from 'react'
import type { StaffRole } from '@/lib/types/app'

export interface SessionData {
  userId: string
  email:  string
  nama:   string
  role:   StaffRole
  roles:  StaffRole[]
}

export const SessionContext = createContext<SessionData | null>(null)

export function useSession() {
  return useContext(SessionContext)
}
