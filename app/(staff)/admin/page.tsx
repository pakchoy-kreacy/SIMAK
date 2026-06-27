// ============================================================
// app/(staff)/admin/page.tsx
// Dashboard Admin — server component
// ============================================================

import { redirect }            from 'next/navigation'
import { getStaffSession }     from '@/lib/auth/staff'
import { createServerClient }  from '@/lib/supabase/server'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role !== 'admin') redirect('/login')

  const supabase = await createServerClient()
  const today = new Date().toISOString().split('T')[0]

  const [
    { count: totalSiswa },
    { count: totalStaff },
    { data: tahunAktifData },
    { count: totalKelas },
    { count: mutabaahHariIni },
    { count: tahfizHariIni },
    { count: wafaHariIni },
    { data: recentMutabaah },
    { data: recentTahfiz },
    { data: recentWafa },
    { data: kelasListRaw },
  ] = await Promise.all([
    supabase.from('siswa').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('user_profile').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('tahun_ajaran').select('id, nama').eq('is_active', true).maybeSingle(),
    supabase.from('kelas').select('*', { count: 'exact', head: true }),
    supabase.from('mutabaah_log').select('*', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('tahfiz_log').select('*', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('wafa_log').select('*', { count: 'exact', head: true }).eq('tanggal', today),
    supabase.from('mutabaah_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('tahfiz_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('wafa_log').select('id, created_at, siswa:siswa_id(nama_lengkap)').order('created_at', { ascending: false }).limit(5),
    supabase.from('kelas').select('id, nama_kelas'),
  ])

  const tahunAktif = tahunAktifData?.nama ?? 'Belum ada'
  const kelasData = kelasListRaw ?? []

  // OPTIMIZED: 3 batch queries instead of N+1 per kelas
  const { data: allSiswaKelas } = await supabase
    .from('siswa_kelas')
    .select('kelas_id, siswa_id')

  const { data: allMutabaahToday } = await supabase
    .from('mutabaah_log')
    .select('siswa_id')
    .eq('tanggal', today)

  // Build lookup maps
  const siswaPerKelas = new Map()
  for (const sk of allSiswaKelas ?? []) {
    if (!siswaPerKelas.has(sk.kelas_id)) siswaPerKelas.set(sk.kelas_id, [])
    siswaPerKelas.get(sk.kelas_id).push(sk.siswa_id)
  }

  const mutabaahSiswaSet = new Set(allMutabaahToday?.map(m => m.siswa_id) ?? [])

  // Build kelas stats in-memory (NO database looping)
  const kelasStats = kelasData.map(kelas => {
    const siswaIds = siswaPerKelas.get(kelas.id) ?? []
    return {
      id: kelas.id,
      nama: kelas.nama_kelas,
      totalSiswaInKelas: siswaIds.length,
      mutabaahTodayInKelas: siswaIds.filter(id => mutabaahSiswaSet.has(id)).length,
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
        mutabaahHariIni: mutabaahHariIni ?? 0,
        tahfizHariIni:  tahfizHariIni ?? 0,
        wafaHariIni:    wafaHariIni ?? 0,
        totalSiswaAktif: totalSiswa ?? 0,
      }}
      recentActivity={{
        mutabaah: (recentMutabaah ?? []).map((m) => ({ id: m.id, time: m.created_at, nama: m.siswa?.nama_lengkap ?? '-' })),
        tahfiz: (recentTahfiz ?? []).map((t) => ({ id: t.id, time: t.created_at, nama: t.siswa?.nama_lengkap ?? '-' })),
        wafa: (recentWafa ?? []).map((w) => ({ id: w.id, time: w.created_at, nama: w.siswa?.nama_lengkap ?? '-' })),
      }}
      kelasList={kelasStats}
      kelasKosong={kelasKosong}
      adminNama={session.nama}
    />
  )
}
