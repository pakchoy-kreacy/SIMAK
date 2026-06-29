// ============================================================
// app/(parent)/layout.tsx
// Layout orang tua: top bar + bottom navigation
// ============================================================

import { redirect }           from 'next/navigation'
import { getParentSession }   from '@/lib/auth/parent'
import { createServiceClient } from '@/lib/supabase/server'
import { ParentShell }        from '@/components/ui/ParentShell'

export default async function ParentLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getParentSession()
  if (!session) redirect('/login')

  const supabase = createServiceClient()
  const { data: siswaData } = await supabase
    .from('siswa')
    .select('jenis_kelamin')
    .eq('id', session.siswaId)
    .single()

  return (
    <ParentShell
      siswaName={session.siswaName}
      siswaId={session.siswaId}
      jenisKelamin={(siswaData?.jenis_kelamin as 'L' | 'P' | null) ?? null}
    >
      {children}
    </ParentShell>
  )
}
