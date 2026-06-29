// ============================================================
// app/api/staff/wali-kelas/route.ts
// GET: Data dashboard wali kelas — status fill rate kelas hari ini
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStaffSession }       from '@/lib/auth/staff'
import { createServiceClient } from '@/lib/supabase/server'
import { getTodayWIB }               from '@/lib/utils/date'

export async function GET(request: NextRequest) {
  try {
    const session  = await requireStaffSession()
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const tanggal  = searchParams.get('tanggal') ?? getTodayWIB()

    // Ambil tahun ajaran aktif (service_client bypass RLS)
    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json({ siswaList: [], stats: null })
    }

    const guruId = session.userId

    // Ambil semua kelas di tahun ajaran ini
    const { data: semuaKelas } = await supabase
      .from('kelas')
      .select('id, nama_kelas, wali_kelas_id')
      .eq('tahun_ajaran_id', tahunAjaran.id)

    // Cari kelas yang wali_kelas_id-nya cocok
    const matchedKelas = (semuaKelas ?? []).filter(k => k.wali_kelas_id === guruId)

    if (matchedKelas.length === 0) {
      return NextResponse.json({ siswaList: [], stats: null })
    }

    const kelasIds = matchedKelas.map(k => k.id)

    // Ambil semua siswa di kelas ini
    const { data: siswaKelas } = await supabase
      .from('siswa_kelas')
      .select(`
        siswa_id,
        kelas:kelas_id ( id, nama_kelas ),
        siswa:siswa_id ( id, nama_lengkap, photo_url, is_active )
      `)
      .in('kelas_id', kelasIds)
      .eq('tahun_ajaran_id', tahunAjaran.id)

    const aktivSiswa = (siswaKelas ?? []).filter((r: any) => r.siswa?.is_active)
    const siswaIds   = aktivSiswa.map((r: any) => r.siswa.id as string)

    // Ambil item — filter by kelas_mutabaah_item jika ada
    let { data: allItems } = await supabase
      .from('mutabaah_item')
      .select('id, parent_id')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('is_active', true)

    // Filter by kelas items (union of all matched kelas)
    const { data: kelasItems } = await supabase
      .from('kelas_mutabaah_item')
      .select('mutabaah_item_id')
      .in('kelas_id', kelasIds)

    if (kelasItems && kelasItems.length > 0 && allItems) {
      const activeSet = new Set(kelasItems.map(k => k.mutabaah_item_id))
      const keepIds = new Set<string>()
      for (const i of allItems) {
        if (activeSet.has(i.id)) {
          keepIds.add(i.id)
          if (i.parent_id) keepIds.add(i.parent_id)
        }
      }
      allItems = allItems.filter(i => keepIds.has(i.id))
    }

    // Leaf items = items whose id is NOT referenced as parent_id by any other item
    const itemList  = allItems ?? []
    const parentIds = new Set(itemList.map(i => i.parent_id).filter(Boolean))
    const leafItems = itemList.filter(i => !parentIds.has(i.id))
    const totalItems = leafItems.length

    // Ambil semua log hari ini untuk siswa ini
    const { data: logs } = await supabase
      .from('mutabaah_log')
      .select('siswa_id, is_checked')
      .in('siswa_id', siswaIds)
      .eq('tanggal', tanggal)

    // Hitung per siswa
    const logBySiswa = new Map<string, { total: number; checked: number }>()
    for (const log of logs ?? []) {
      const curr = logBySiswa.get(log.siswa_id) ?? { total: 0, checked: 0 }
      curr.total++
      if (log.is_checked) curr.checked++
      logBySiswa.set(log.siswa_id, curr)
    }

    // Tentukan status per siswa
    const siswaList = aktivSiswa.map((row: any) => {
      const stats   = logBySiswa.get(row.siswa.id)
      const checked = stats?.checked ?? 0
      const filled  = stats?.total   ?? 0

      let fillStatus: 'lengkap' | 'sebagian' | 'belum' = 'belum'
      if (filled > 0) {
        fillStatus = checked === totalItems ? 'lengkap' : 'sebagian'
      }

      const pct = totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0

      return {
        siswaId:     row.siswa.id,
        namaLengkap: row.siswa.nama_lengkap,
        photoUrl:    row.siswa.photo_url,
        kelasId:     row.kelas.id,
        namaKelas:   row.kelas.nama_kelas,
        fillStatus,
        percentage:  pct,
        checkedCount: checked,
        totalItems,
      }
    }).sort((a: any, b: any) =>
      a.namaKelas.localeCompare(b.namaKelas) ||
      a.namaLengkap.localeCompare(b.namaLengkap)
    )

    // Stats ringkasan
    const sudahLengkap = siswaList.filter((s: any) => s.fillStatus === 'lengkap').length
    const sudahSebagian = siswaList.filter((s: any) => s.fillStatus === 'sebagian').length
    const belumIsi = siswaList.filter((s: any) => s.fillStatus === 'belum').length
    const totalSiswa = siswaList.length
    const avgPct = totalSiswa > 0
      ? Math.round(siswaList.reduce((s: number, r: any) => s + r.percentage, 0) / totalSiswa)
      : 0

    return NextResponse.json({
      siswaList,
      stats: {
        totalSiswa,
        sudahLengkap,
        sudahSebagian,
        belumIsi,
        avgPercentage: avgPct,
        tanggal,
        namaKelas: matchedKelas.map(k => k.nama_kelas).join(', '),
      },
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    }
    console.error('GET wali-kelas error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
