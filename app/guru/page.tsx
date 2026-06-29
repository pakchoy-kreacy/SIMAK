// ============================================================
// app/guru/page.tsx
// Dashboard Guru — server component (per-class cards)
// ============================================================

import { redirect }            from 'next/navigation'
import { getStaffSession }     from '@/lib/auth/staff'
import { createServerClient }  from '@/lib/supabase/server'
import { GuruDashboardClient } from './GuruDashboardClient'

export default async function GuruPage() {
  const session = await getStaffSession()
  if (!session) redirect('/login')
  if (session.role === 'admin') redirect('/admin')

  const supabase = await createServerClient()

  const { data: tahunAktif } = await supabase
    .from('tahun_ajaran')
    .select('id, nama')
    .eq('is_active', true)
    .maybeSingle()

  let kelasCards = []
  let totalSiswa = 0
  let totalKelas = 0
  let mutabaahToday = 0

  if (tahunAktif) {
    const today = new Date().toISOString().split('T')[0]

    // Get classes that have students (sync with admin)
    const { data: siswaKelasRows } = await supabase
      .from('siswa_kelas')
      .select('kelas_id')
      .eq('tahun_ajaran_id', tahunAktif.id)
    const aktifKelasIds = [...new Set(siswaKelasRows?.map(r => r.kelas_id) ?? [])]

    const { data: kelasSaya } = await supabase
      .from('kelas')
      .select('id, nama_kelas')
      .eq('tahun_ajaran_id', tahunAktif.id)
      .eq('wali_kelas_id', session.userId)
      .in('id', aktifKelasIds)

    const kelasList = kelasSaya ?? []
    totalKelas = kelasList.length
    const kelasIds = kelasList.map(k => k.id)

    if (kelasIds.length === 0) {
      return (
        <GuruDashboardClient
          nama={session.nama}
          stats={{
            totalSiswa: 0,
            totalKelas: 0,
            tahunAktif: tahunAktif?.nama ?? 'Belum ada',
            mutabaahToday: 0,
          }}
          kelasCards={[]}
        />
      )
    }

    // OPTIMIZED: Batch queries instead of N+1
    const { data: allSiswaKelas } = await supabase
      .from('siswa_kelas')
      .select('kelas_id, siswa_id')
      .in('kelas_id', kelasIds)
      .eq('tahun_ajaran_id', tahunAktif.id)

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

    // Get all active items for these classes
    const { data: allItems } = await supabase
      .from('kelas_mutabaah_item')
      .select('kelas_id, mutabaah_item_id')
      .in('kelas_id', kelasIds)

    const itemsPerKelas = new Map()
    for (const item of allItems ?? []) {
      if (!itemsPerKelas.has(item.kelas_id)) itemsPerKelas.set(item.kelas_id, new Set())
      itemsPerKelas.get(item.kelas_id).add(item.mutabaah_item_id)
    }

    for (const kelas of kelasList) {
      const siswaIds = siswaPerKelas.get(kelas.id) ?? []
      const jumlahSiswa = siswaIds.length
      totalSiswa += jumlahSiswa

      const kelasMutabaahToday = siswaIds.filter((id: string) => mutabaahSiswaSet.has(id)).length
      mutabaahToday += kelasMutabaahToday

      const totalItems = itemsPerKelas.get(kelas.id)?.size ?? 0

      const mutabaahRate = jumlahSiswa > 0 ? Math.round((kelasMutabaahToday / jumlahSiswa) * 100) : 0
      kelasCards.push({
        kelasId: kelas.id,
        namaKelas: kelas.nama_kelas,
        nama: kelas.nama_kelas,
        jumlahSiswa,
        mutabaahToday: kelasMutabaahToday,
        mutabaahRate,
        totalItems,
        checkedItems: 0,
      })
    }
  }

  return (
    <GuruDashboardClient
      nama={session.nama}
      stats={{
        totalSiswa,
        totalKelas,
        tahunAktif: tahunAktif?.nama ?? 'Belum ada',
        mutabaahToday,
      }}
      kelasCards={kelasCards}
    />
  )
}
