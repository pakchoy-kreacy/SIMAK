// ============================================================
// app/api/admin/tahun-ajaran/route.ts
// GET:  Semua tahun ajaran
// POST: Buat tahun ajaran baru
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }      from '@/lib/supabase/server'

export async function GET() {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const { data, error } = await supabase
      .from('tahun_ajaran')
      .select('*')
      .order('nama', { ascending: false })
    if (error) throw error

    // Batch stats: kelas & siswa dihitung dari siswa_kelas (data utama = siswa)
    const tahunIds = (data ?? []).map(t => t.id)
    if (tahunIds.length === 0) return NextResponse.json(data ?? [])

    const [{ data: allSiswaKelas }, { count: totalGuru }] = await Promise.all([
      supabase.from('siswa_kelas').select('kelas_id, siswa_id, tahun_ajaran_id').in('tahun_ajaran_id', tahunIds),
      supabase.from('user_profile').select('*', { count: 'exact', head: true }).eq('is_active', true),
    ])

    // Group by tahun_ajaran_id in-memory
    const kelasByTahun = new Map<string, Set<string>>()
    const siswaByTahun = new Map<string, Set<string>>()
    for (const sk of allSiswaKelas ?? []) {
      if (!kelasByTahun.has(sk.tahun_ajaran_id)) kelasByTahun.set(sk.tahun_ajaran_id, new Set())
      if (!siswaByTahun.has(sk.tahun_ajaran_id)) siswaByTahun.set(sk.tahun_ajaran_id, new Set())
      kelasByTahun.get(sk.tahun_ajaran_id)!.add(sk.kelas_id)
      siswaByTahun.get(sk.tahun_ajaran_id)!.add(sk.siswa_id)
    }

    const result = (data ?? []).map(t => ({
      ...t,
      jumlah_kelas: kelasByTahun.get(t.id)?.size ?? 0,
      jumlah_siswa: siswaByTahun.get(t.id)?.size ?? 0,
      jumlah_guru: totalGuru ?? 0,
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const body     = await request.json()
    const { nama } = body

    if (!nama?.trim()) {
      return NextResponse.json({ error: 'Nama tahun ajaran wajib diisi' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('tahun_ajaran')
      .insert({ nama: nama.trim(), is_active: false })
      .select().single()

    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Tahun ajaran sudah ada' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ success: true, data })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
