// ============================================================
// app/api/admin/kelas/route.ts
// GET:  Daftar kelas per tahun ajaran (DERIVED dari siswa_kelas)
// POST: Buat kelas baru
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }       from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const tahunId = searchParams.get('tahunId')
    const today = new Date().toISOString().split('T')[0]

    // 1. Ambil kelas_id unik dari siswa_kelas (kelas adalah tampilan, bukan data utama)
    let siswaKelasQuery = supabase.from('siswa_kelas').select('kelas_id')
    if (tahunId) siswaKelasQuery = siswaKelasQuery.eq('tahun_ajaran_id', tahunId)
    const { data: siswaKelasRows, error: skError } = await siswaKelasQuery
    if (skError) {
      console.error('admin/kelas: siswa_kelas query error:', skError)
      return NextResponse.json({ error: `siswa_kelas: ${skError.message}` }, { status: 500 })
    }

    const kelasIds = Array.from(new Set((siswaKelasRows ?? []).map((r: any) => r.kelas_id))).filter(Boolean) as string[]
    if (kelasIds.length === 0) {
      return NextResponse.json([])
    }

    // 2. Ambil detail kelas (tanpa join FK yang rentan error)
    const { data: kelasData, error: kelasError } = await supabase
      .from('kelas')
      .select('id, nama_kelas, tahun_ajaran_id, wali_kelas_id')
      .in('id', kelasIds)
      .order('nama_kelas', { ascending: true })

    if (kelasError) {
      console.error('admin/kelas: kelas query error:', kelasError)
      return NextResponse.json({ error: `kelas: ${kelasError.message}` }, { status: 500 })
    }

    // 3. Ambil metadata tahun ajaran & wali kelas secara terpisah
    const tahunIds = [...new Set((kelasData ?? []).map((k: any) => k.tahun_ajaran_id).filter(Boolean))]
    const waliIds  = [...new Set((kelasData ?? []).map((k: any) => k.wali_kelas_id).filter(Boolean))]

    const [
      { data: tahunData, error: tahunError },
      { data: waliData, error: waliError },
    ] = await Promise.all([
      tahunIds.length > 0
        ? supabase.from('tahun_ajaran').select('id, nama').in('id', tahunIds)
        : Promise.resolve({ data: [], error: null }),
      waliIds.length > 0
        ? supabase.from('user_profile').select('id, nama').in('id', waliIds)
        : Promise.resolve({ data: [], error: null }),
    ])

    if (tahunError) console.error('admin/kelas: tahun_ajaran query error:', tahunError)
    if (waliError)  console.error('admin/kelas: user_profile query error:', waliError)

    const tahunMap = new Map((tahunData ?? []).map((t: any) => [t.id, t.nama]))
    const waliMap  = new Map((waliData ?? []).map((w: any) => [w.id, w.nama]))

    // 4. Fetch mutabaah item assignments per kelas
    let kelasItemMap = new Map<string, { item_id: string; item_nama: string }[]>()
    const { data: kelasItems, error: itemsError } = await supabase
      .from('kelas_mutabaah_item')
      .select('kelas_id, mutabaah_item_id, item:mutabaah_item_id(nama_item)')
      .in('kelas_id', kelasIds)
    if (itemsError) {
      console.error('admin/kelas: kelas_mutabaah_item query error:', itemsError)
    } else if (kelasItems) {
      for (const ki of kelasItems) {
        const arr = kelasItemMap.get(ki.kelas_id) ?? []
        arr.push({ item_id: ki.mutabaah_item_id, item_nama: (ki.item as any)?.nama_item ?? '-' })
        kelasItemMap.set(ki.kelas_id, arr)
      }
    }

    // 5. Ambil semua siswa_kelas + log hari ini untuk hitung statistik
    const [
      { data: allSiswaKelas, error: skAllError },
      { data: mutabaahRows, error: mutabaahError },
      { data: tahfizRows, error: tahfizError },
    ] = await Promise.all([
      supabase.from('siswa_kelas').select('kelas_id, siswa_id').in('kelas_id', kelasIds),
      supabase.from('mutabaah_log').select('siswa_id').eq('tanggal', today),
      supabase.from('tahfiz_log').select('siswa_id').eq('tanggal', today),
    ])

    if (skAllError)     console.error('admin/kelas: siswa_kelas all query error:', skAllError)
    if (mutabaahError)  console.error('admin/kelas: mutabaah_log query error:', mutabaahError)
    if (tahfizError)    console.error('admin/kelas: tahfiz_log query error:', tahfizError)

    const siswaByKelas = new Map<string, Set<string>>()
    for (const row of allSiswaKelas ?? []) {
      if (!siswaByKelas.has(row.kelas_id)) siswaByKelas.set(row.kelas_id, new Set())
      siswaByKelas.get(row.kelas_id)!.add(row.siswa_id)
    }

    const mutabaahSiswaIds = new Set((mutabaahRows ?? []).map((r: any) => r.siswa_id))
    const tahfizSiswaIds   = new Set((tahfizRows ?? []).map((r: any) => r.siswa_id))

    const result = (kelasData ?? []).map(k => {
      const siswaIds = siswaByKelas.get(k.id) ?? new Set()
      const totalSiswa = siswaIds.size
      let mutabaahTerisi = 0
      let tahfizTerisi = 0
      for (const sid of siswaIds) {
        if (mutabaahSiswaIds.has(sid)) mutabaahTerisi++
        if (tahfizSiswaIds.has(sid)) tahfizTerisi++
      }
      return {
        id: k.id,
        nama_kelas: k.nama_kelas,
        tahun_ajaran_id: k.tahun_ajaran_id,
        tahun_ajaran: { nama: tahunMap.get(k.tahun_ajaran_id) ?? '-' },
        wali_kelas: k.wali_kelas_id ? { id: k.wali_kelas_id, nama: waliMap.get(k.wali_kelas_id) ?? '-' } : null,
        jumlah_siswa: totalSiswa,
        mutabaah_hari_ini: mutabaahTerisi,
        tahfiz_hari_ini: tahfizTerisi,
        mutabaah_items: kelasItemMap.get(k.id) ?? [],
      }
    })

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('GET /api/admin/kelas unexpected error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const body     = await request.json()
    const { namaKelas, tahunAjaranId, waliKelasId } = body

    if (!namaKelas || !tahunAjaranId) {
      return NextResponse.json({ error: 'Nama kelas dan tahun ajaran wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('kelas')
      .insert({
        nama_kelas:      namaKelas.trim(),
        tahun_ajaran_id: tahunAjaranId,
        wali_kelas_id:   waliKelasId || null,
      })
      .select().single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Nama kelas sudah ada di tahun ajaran ini' }, { status: 409 })
      }
      throw error
    }

    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('POST /api/admin/kelas error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
