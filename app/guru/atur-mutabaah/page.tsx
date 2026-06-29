import { redirect }           from 'next/navigation'
import { getStaffSession }    from '@/lib/auth/staff'
import { createServiceClient } from '@/lib/supabase/server'
import { AturMutabaahClient } from './AturMutabaahClient'

export default async function AturMutabaahPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  const supabase = createServiceClient()

  const { data: tahunAjaran } = await supabase
    .from('tahun_ajaran')
    .select('id')
    .eq('is_active', true)
    .single()

  if (!tahunAjaran) return <p className="p-4 text-sm text-neutral-400">Belum ada tahun ajaran aktif</p>

  // Only show classes teacher is assigned to AND have students
  const { data: siswaKelasRows } = await supabase
    .from('siswa_kelas')
    .select('kelas_id')
    .eq('tahun_ajaran_id', tahunAjaran.id)
  const aktifKelasIds = [...new Set(siswaKelasRows?.map(r => r.kelas_id) ?? [])]

  const { data: kelasSaya } = await supabase
    .from('kelas')
    .select('id, nama_kelas')
    .eq('tahun_ajaran_id', tahunAjaran.id)
    .in('id', aktifKelasIds)
    .eq('wali_kelas_id', session.userId)

  return <AturMutabaahClient kelasList={kelasSaya ?? []} />
}
