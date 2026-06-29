// ============================================================
// app/api/admin/kelas/route.ts
// GET:  Daftar kelas per tahun ajaran (DERIVED dari siswa_kelas)
// POST: Buat kelas baru
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }      from '@/lib/supabase/server'

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
    if (skError) throw skError

    const kelasIds = Array.from(new Set((siswaKelasRows ?? []).map((r: any) => r.kelas_id))).filter(Boolean) as string[]

    if (kelasIds.length === 0) {
      return NextResponse.json([])
    }

    // 2. Ambil detail kelas + wali kelas + tahun ajaran
    const { data: kelasData, error: kelasError } = await supabase
      .from('kelas')
      .select(`
        id, nama_kelas, tahun_ajaran_id,
        tahun_ajaran:tahun_ajaran_id(nama),
        wali_kelas:wali_kelas_id(id, nama)
      `)
      .in('id', kelasIds)
      .order('nama_kelas', { ascending: true })

    if (kelasError) throw kelasError

    // 3. Fetch mutabaah item assignments per kelas
    let kelasItemMap = new Map<string, { item_id: string; item_nama: string }[]>()
    const { data: kelasItems } = await supabase
      .from('kelas_mutabaah_item')
      .select('kelas_id, mutabaah_item_id, item:mutabaah_item_id(nama_item)')
      .in('kelas_id', kelasIds)
    if (kelasItems) {
      for (const ki of kelasItems) {
        const arr = kelasItemMap.get(ki.kelas_id) ?? []
        arr.push({ item_id: ki.mutabaah_item_id, item_nama: (ki.item as any)?.nama_item ?? '-' })
        kelasItemMap.set(ki.kelas_id, arr)
      }
    }

    // 4. Ambil semua siswa_kelas + log hari ini
    const [
      { data: allSiswaKelas },
      { data: mutabaahRows },
      { data: tahfizRows },
    ] = await Promise.all([
      supabase.from('siswa_kelas').select('kelas_id, siswa_id').in('kelas_id', kelasIds),
      supabase.from('mutabaah_log').select('siswa_id').eq('tanggal', today),
      supabase.from('tahfiz_log').select('siswa_id').eq('tanggal', today),
    ])

    const siswaByKelas = new Map<string, Set<string>>()
    for (const row of allSiswaKelas ?? []) {
      if (!siswaByKelas.has(row.kelas_id)) siswaByKelas.set(row.kelas_id, new Set())
      siswaByKelas.get(row.kelas_id)!.add(row.siswa_id)
    }

    const mutabaahSiswaIds = new Set((mutabaahRows ?? []).map((r: any) => r.siswa_id))
    const tahfizSiswaIds = new Set((tahfizRows ?? []).map((r: any) => r.siswa_id))

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
        ...k,
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
    console.error('GET /api/admin/kelas error:', err)
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
