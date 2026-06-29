// ============================================================
// app/(staff)/admin/siswa/[siswaId]/page.tsx
// Detail/edit satu siswa — admin
// ============================================================

import { redirect }           from 'next/navigation'
import { getStaffSession }    from '@/lib/auth/staff'
import { createServerClient } from '@/lib/supabase/server'
import { AdminSiswaDetailClient } from './AdminSiswaDetailClient'

interface Props {
  params: Promise<{ siswaId: string }>
}

export default async function AdminSiswaDetailPage({ params }: Props) {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/login')

  const { siswaId } = await params
  const supabase    = await createServerClient()

  const { data: siswa } = await supabase
    .from('siswa')
    .select('id, nisn, nama_lengkap, jenis_kelamin, parent_name, parent_phone, photo_url, is_active')
    .eq('id', siswaId)
    .single()

  if (!siswa) redirect('/admin/siswa')

  // Riwayat kelas
  const { data: kelasHistory } = await supabase
    .from('siswa_kelas')
    .select('kelas:kelas_id(nama_kelas), tahun_ajaran:tahun_ajaran_id(nama)')
    .eq('siswa_id', siswaId)

  return (
    <AdminSiswaDetailClient
      siswa={siswa}
      kelasHistory={(kelasHistory ?? []).map((r: any) => ({
        namaKelas:   r.kelas?.nama_kelas ?? '-',
        tahunAjaran: r.tahun_ajaran?.nama ?? '-',
      }))}
    />
  )
}
