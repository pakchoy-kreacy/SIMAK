// ============================================================
// app/api/staff/atur-mutabaah/route.ts
// GET:  Item mutabaah + kelas guru + assignment
// PATCH: Terapkan item ke beberapa kelas (hanya kelas sendiri)
// DELETE: Lepas item dari kelas (hanya kelas sendiri)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStaffSession }       from '@/lib/auth/staff'
import { createServiceClient }       from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const session  = await requireStaffSession()
    const supabase = createServiceClient()

    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json({ items: [], kelasList: [], assignments: [] })
    }

    const guruId = session.userId

    // 1. Kelas milik guru yang punya siswa
    const { data: siswaKelasRows } = await supabase
      .from('siswa_kelas')
      .select('kelas_id')
      .eq('tahun_ajaran_id', tahunAjaran.id)
    const adaSiswa = new Set((siswaKelasRows ?? []).map(r => r.kelas_id))

    const { data: kelasData } = await supabase
      .from('kelas')
      .select('id, nama_kelas')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('wali_kelas_id', guruId)
      .in('id', Array.from(adaSiswa))
      .order('nama_kelas', { ascending: true })

    const kelasList = kelasData ?? []
    const kelasIds = kelasList.map(k => k.id)

    // 2. Semua item mutabaah aktif
    let allItems: any[] = []
    const { data: itemsData, error: itemsError } = await supabase
      .from('mutabaah_item')
      .select('id, nama_item, parent_id, urutan, tipe')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('is_active', true)
      .order('urutan', { ascending: true }) as any

    if (itemsError && itemsError.message?.includes('tipe')) {
      const { data: fallbackItems } = await supabase
        .from('mutabaah_item')
        .select('id, nama_item, parent_id, urutan')
        .eq('tahun_ajaran_id', tahunAjaran.id)
        .eq('is_active', true)
        .order('urutan', { ascending: true }) as any
      allItems = (fallbackItems ?? []).map((i: any) => ({ ...i, tipe: 'checkbox' }))
    } else if (itemsError) {
      throw itemsError
    } else {
      allItems = itemsData ?? []
    }

    // 3. Assignment item ke kelas guru
    let assignments: { mutabaah_item_id: string; kelas_id: string }[] = []
    if (kelasIds.length > 0) {
      const { data: kmData } = await supabase
        .from('kelas_mutabaah_item')
        .select('mutabaah_item_id, kelas_id')
        .in('kelas_id', kelasIds)
      assignments = kmData ?? []
    }

    // 4. Hitung jumlah siswa per kelas
    const { data: siswaCounts } = await supabase
      .from('siswa_kelas')
      .select('kelas_id')
      .in('kelas_id', kelasIds)
      .eq('tahun_ajaran_id', tahunAjaran.id)

    const countMap = new Map<string, number>()
    for (const r of siswaCounts ?? []) {
      countMap.set(r.kelas_id, (countMap.get(r.kelas_id) ?? 0) + 1)
    }

    const kelasListWithCount = kelasList.map(k => ({
      ...k,
      jumlah_siswa: countMap.get(k.id) ?? 0,
    }))

    return NextResponse.json({
      items: allItems,
      kelasList: kelasListWithCount,
      assignments,
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('GET atur-mutabaah error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// PATCH: Terapkan item ke beberapa kelas
// Body: { itemId, kelasIds: string[] }
export async function PATCH(request: NextRequest) {
  try {
    const session  = await requireStaffSession()
    const supabase = createServiceClient()
    const body     = await request.json()
    const { itemId, kelasIds } = body as { itemId: string; kelasIds: string[] }

    if (!itemId || !kelasIds?.length) {
      return NextResponse.json({ error: 'itemId dan kelasIds wajib diisi' }, { status: 400 })
    }

    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json({ error: 'Tidak ada tahun ajaran aktif' }, { status: 400 })
    }

    // Validasi kelas milik guru
    const { data: kelasSaya } = await supabase
      .from('kelas')
      .select('id')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('wali_kelas_id', session.userId)
      .in('id', kelasIds)

    const validKelasIds = (kelasSaya ?? []).map(k => k.id)
    if (validKelasIds.length === 0) {
      return NextResponse.json({ error: 'Tidak ada kelas yang valid' }, { status: 403 })
    }

    const inserts = validKelasIds.map(kelasId => ({
      mutabaah_item_id: itemId,
      kelas_id: kelasId,
    }))

    const { error } = await supabase
      .from('kelas_mutabaah_item')
      .upsert(inserts, { onConflict: 'mutabaah_item_id,kelas_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('PATCH atur-mutabaah error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE: Lepas item dari kelas
// Body: { itemId, kelasId? } — kalau kelasId kosong, lepas dari semua kelas guru
export async function DELETE(request: NextRequest) {
  try {
    const session  = await requireStaffSession()
    const supabase = createServiceClient()
    const body     = await request.json()
    const { itemId, kelasId } = body as { itemId: string; kelasId?: string }

    if (!itemId) {
      return NextResponse.json({ error: 'itemId wajib diisi' }, { status: 400 })
    }

    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json({ error: 'Tidak ada tahun ajaran aktif' }, { status: 400 })
    }

    let query = supabase
      .from('kelas_mutabaah_item')
      .delete()
      .eq('mutabaah_item_id', itemId)

    if (kelasId) {
      // Validasi kelas milik guru
      const { data: kelasSaya } = await supabase
        .from('kelas')
        .select('id')
        .eq('id', kelasId)
        .eq('wali_kelas_id', session.userId)
        .single()

      if (!kelasSaya) {
        return NextResponse.json({ error: 'Kelas tidak valid' }, { status: 403 })
      }
      query = query.eq('kelas_id', kelasId)
    } else {
      // Lepas dari semua kelas guru
      const { data: kelasSaya } = await supabase
        .from('kelas')
        .select('id')
        .eq('tahun_ajaran_id', tahunAjaran.id)
        .eq('wali_kelas_id', session.userId)

      const validIds = (kelasSaya ?? []).map(k => k.id)
      if (validIds.length === 0) {
        return NextResponse.json({ error: 'Tidak ada kelas' }, { status: 403 })
      }
      query = query.in('kelas_id', validIds)
    }

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('DELETE atur-mutabaah error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
