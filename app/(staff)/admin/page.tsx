// ============================================================
// app/(staff)/admin/page.tsx
// Dashboard Admin — server component
// ============================================================

import { redirect }            from 'next/navigation'
import { getStaffSession }     from '@/lib/auth/staff'
import { createServiceClient } from '@/lib/supabase/server'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/login')

  const supabase = createServiceClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalSiswa },
    { count: totalStaff },
    { data: tahunAktifData },
    { count: tahfizHariIni },
    { count: wafaHariIni },
    { data: recentMutabaah },
    { data: recentTahfiz },
    { data: recentWafa },
    { data: allMutabaahToday },
    { data: allSiswaKelas },
  ] = await Promise.all([
    supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('user_profile').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tahun_ajaran').select('id, nama').eq('is_active', true).maybeSingle(),
    supabase.from('tahfiz_log').select('*', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('wafa_log').select('*', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('mutabaah_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('tahfiz_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('wafa_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('mutabaah_log').select('siswa_id').eq('tanggal', today),
    supabase.from('siswa_kelas').select('kelas_id, siswa_id, kelas:kelas_id(id, nama_kelas)'),
  ])

  const tahunAktif = tahunAktifData?.nama ?? 'Belum ada'

  // Build lookup maps
  const siswaPerKelas = new Map()
  const kelasMeta = new Map<string, string>()
  for (const sk of allSiswaKelas ?? []) {
    if (!siswaPerKelas.has(sk.kelas_id)) siswaPerKelas.set(sk.kelas_id, [])
    siswaPerKelas.get(sk.kelas_id).push(sk.siswa_id)
    if (!kelasMeta.has(sk.kelas_id)) {
      kelasMeta.set(sk.kelas_id, (sk.kelas as any)?.nama_kelas ?? '-')
    }
  }

  const totalKelas = kelasMeta.size
  const mutabaahSiswaSet = new Set(allMutabaahToday?.map(m => m.siswa_id) ?? [])

  // Build kelas stats in-memory (NO database looping)
  const kelasStats = Array.from(kelasMeta.entries()).map(([id, nama]) => {
    const siswaIds = siswaPerKelas.get(id) ?? []
    const mutabaahToday = siswaIds.filter((id: string) => mutabaahSiswaSet.has(id)).length
    const mutabaahRate = siswaIds.length > 0 ? Math.round((mutabaahToday / siswaIds.length) * 100) : 0
    return {
      id,
      nama,
      totalSiswaInKelas: siswaIds.length,
      mutabaahTodayInKelas: mutabaahToday,
      jumlahSiswa: siswaIds.length,
      mutabaahRate: mutabaahRate,
    }
  })

  const kelasKosong = kelasStats.filter(k => k.totalSiswaInKelas === 0)

  return (
    <AdminDashboardClient
      stats={{
        totalSiswa:     totalSiswa ?? 0,
        totalStaff:     totalStaff ?? 0,
        totalKelas:     totalKelas ?? 0,
        tahunAktif,
        mutabaahHariIni: allMutabaahToday?.length ?? 0,
        tahfizHariIni:  tahfizHariIni ?? 0,
        wafaHariIni:    wafaHariIni ?? 0,
        totalSiswaAktif: totalSiswa ?? 0,
      }}
      recentActivity={{
        mutabaah: (recentMutabaah ?? []).map((m: any) => ({ id: m.id, time: m.created_at, nama: m.siswa?.nama_lengkap ?? '-' })),
        tahfiz: (recentTahfiz ?? []).map((t: any) => ({ id: t.id, time: t.created_at, nama: t.siswa?.nama_lengkap ?? '-' })),
        wafa: (recentWafa ?? []).map((w: any) => ({ id: w.id, time: w.created_at, nama: w.siswa?.nama_lengkap ?? '-' })),
      }}
      kelasList={kelasStats}
      kelasKosong={kelasKosong}
      adminNama={session.nama}
    />
  )
}
