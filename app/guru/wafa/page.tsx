// ============================================================
// app/guru/wafa/page.tsx
// Daftar siswa untuk input wafa — server component
// ============================================================

import { redirect }            from 'next/navigation'
import { getStaffSession }     from '@/lib/auth/staff'
import { SiswaList }           from '@/components/siswa/SiswaList'

export default async function GuruWafaPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  return (
    <div className="flex flex-col min-h-screen">
      <div className="px-4 py-4 border-b border-neutral-100 bg-white">
        <h2 className="text-lg font-bold text-neutral-800">Progres Wafa</h2>
        <p className="text-xs text-neutral-400 mt-0.5">Pilih siswa untuk input progres</p>
      </div>
      <div className="flex-1 overflow-y-auto">
        <SiswaList detailPath="/guru/wafa" />
      </div>
    </div>
  )
}
