// ============================================================
// app/api/parent/mutabaah/route.ts
// GET:  Ambil data mutabaah (hari ini / weekly / monthly)
// POST: Upsert satu item mutabaah (toggle auto-save)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireParentSession }      from '@/lib/auth/parent'
import { createServiceClient }       from '@/lib/supabase/server'
import { getTodayWIB, getLockedAfter, getLast7Days,
         getDaysInMonth, formatHariPendek }  from '@/lib/utils/date'
import type { MutabaahDayData, WeeklyData, MonthlyData } from '@/lib/types/app'

// -----------------------------------------------------------
// GET /api/parent/mutabaah
// Query params:
//   - tanggal: YYYY-MM-DD (default: hari ini)
//   - range: 'weekly' | 'monthly'
//   - year, month: untuk range=monthly
// -----------------------------------------------------------
export async function GET(request: NextRequest) {
  try {
    const session  = await requireParentSession()
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const range    = searchParams.get('range')

    // ---- WEEKLY ----
    if (range === 'weekly') {
      const days = getLast7Days()
      const weeklyData: WeeklyData[] = []

      for (const tanggal of days) {
        const { data: logs } = await supabase
          .from('mutabaah_log')
          .select('is_checked')
          .eq('siswa_id', session.siswaId)
          .eq('tanggal', tanggal)

        const total   = logs?.length ?? 0
        const checked = logs?.filter(l => l.is_checked).length ?? 0

        weeklyData.push({
          tanggal,
          label:      formatHariPendek(tanggal),
          percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
          total,
          checked,
        })
      }

      return NextResponse.json(weeklyData)
    }

    // ---- MONTHLY ----
    if (range === 'monthly') {
      const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()))
      const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1))
      const days  = getDaysInMonth(year, month)

      // Ambil semua log sekaligus (lebih efisien)
      const { data: allLogs } = await supabase
        .from('mutabaah_log')
        .select('tanggal, is_checked')
        .eq('siswa_id', session.siswaId)
        .gte('tanggal', days[0])
        .lte('tanggal', days[days.length - 1])

      // Ambil total item aktif
      const { data: tahunAktifForItems } = await supabase
        .from('tahun_ajaran')
        .select('id')
        .eq('is_active', true)
        .single()

      let totalItems = 0
      if (tahunAktifForItems) {
        const { data: activeItems } = await supabase
          .from('mutabaah_item')
          .select('id')
          .eq('tahun_ajaran_id', tahunAktifForItems.id)
          .eq('is_active', true)
        totalItems = activeItems?.length ?? 0
      }

      const monthlyData: MonthlyData[] = days.map(tanggal => {
        const dayLogs = allLogs?.filter(l => l.tanggal === tanggal) ?? []
        if (dayLogs.length === 0) return { tanggal, percentage: null }
        const checked = dayLogs.filter(l => l.is_checked).length
        return {
          tanggal,
          percentage: totalItems > 0 ? Math.round((checked / totalItems) * 100) : 0,
        }
      })

      return NextResponse.json(monthlyData)
    }

    // ---- HARI INI (DEFAULT) ----
    const tanggal = searchParams.get('tanggal') ?? getTodayWIB()

    // Ambil item mutabaah aktif untuk tahun ajaran aktif
    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json({
        tanggal,
        items:      [],
        percentage: 0,
        is_locked:  false,
      } satisfies MutabaahDayData)
    }

    // Fetch items — handle parent_id column missing gracefully
    let allItems: Array<{ id: string; nama_item: string; urutan: number; parent_id: string | null; tipe: string }> = []
    const { data: itemsData, error: itemsError } = await supabase
      .from('mutabaah_item')
      .select('id, nama_item, urutan, parent_id, tipe')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('is_active', true)
      .order('urutan', { ascending: true }) as any

    if (itemsError && itemsError.message?.includes('parent_id')) {
      const { data: fallbackItems } = await supabase
        .from('mutabaah_item')
        .select('id, nama_item, urutan, tipe')
        .eq('tahun_ajaran_id', tahunAjaran.id)
        .eq('is_active', true)
        .order('urutan', { ascending: true }) as any
      allItems = (fallbackItems ?? []).map((i: any) => ({ ...i, parent_id: null }))
    } else if (itemsError && itemsError.message?.includes('tipe')) {
      const { data: fallbackItems } = await supabase
        .from('mutabaah_item')
        .select('id, nama_item, urutan, parent_id')
        .eq('tahun_ajaran_id', tahunAjaran.id)
        .eq('is_active', true)
        .order('urutan', { ascending: true }) as any
      allItems = (fallbackItems ?? []).map((i: any) => ({ ...i, tipe: 'checkbox' }))
    } else {
      if (itemsError) throw itemsError
      allItems = (itemsData as any[]) ?? []
    }

    // Filter items by kelas (guru pilih item yang berlaku)
    const { data: siswaKelas } = await supabase
      .from('siswa_kelas')
      .select('kelas_id')
      .eq('siswa_id', session.siswaId)
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .maybeSingle()

    if (siswaKelas?.kelas_id) {
      const { data: kelasItems } = await supabase
        .from('kelas_mutabaah_item')
        .select('mutabaah_item_id')
        .eq('kelas_id', siswaKelas.kelas_id)

      if (kelasItems && kelasItems.length > 0) {
        const activeIdSet = new Set(kelasItems.map(k => k.mutabaah_item_id))
        const activeItemIds = new Set<string>()
        for (const i of allItems) {
          if (activeIdSet.has(i.id)) {
            activeItemIds.add(i.id)
            if (i.parent_id) activeItemIds.add(i.parent_id)  // child → parent
          }
        }
        // Also include children of any included parent
        for (const i of allItems) {
          if (i.parent_id && activeItemIds.has(i.parent_id)) {
            activeItemIds.add(i.id)
          }
        }
        allItems = allItems.filter(i => activeItemIds.has(i.id))
      }
    }

    const items = allItems

    // Ambil log untuk hari ini
    const { data: logs } = await supabase
      .from('mutabaah_log')
      .select('item_id, is_checked, locked_after, catatan')
      .eq('siswa_id', session.siswaId)
      .eq('tanggal', tanggal) as any

    const lockedAfter = getLockedAfter(tanggal)
    const isLocked    = new Date() > new Date(lockedAfter)

    const logMap = new Map((logs as any[])?.map((l: any) => [l.item_id, l]) ?? [])

    const itemsWithStatus = items.map(item => ({
      id:         item.id,
      nama_item:  item.nama_item,
      urutan:     item.urutan,
      is_checked: logMap.get(item.id)?.is_checked ?? false,
      is_locked:  isLocked,
      parent_id:  item.parent_id,
      tipe:       item.tipe ?? 'checkbox',
      catatan:    logMap.get(item.id)?.catatan ?? null,
    }))

    // Build hierarchy for percentage — count leaf items only
    const parentItems = itemsWithStatus.filter(i => !i.parent_id)
    const childItems  = itemsWithStatus.filter(i => i.parent_id)
    const hierarchicalItems = parentItems.map(p => ({
      ...p,
      children: childItems.filter(c => c.parent_id === p.id),
    }))
    const leafItems  = hierarchicalItems.flatMap(p =>
      p.children.length > 0 ? p.children : [p]
    )
    const checked    = leafItems.filter(i => i.is_checked).length
    const percentage = leafItems.length > 0
      ? Math.round((checked / leafItems.length) * 100)
      : 0

    return NextResponse.json({
      tanggal,
      items:      itemsWithStatus,
      percentage,
      is_locked:  isLocked,
    } satisfies MutabaahDayData)

  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 })
    }
    console.error('GET mutabaah error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// -----------------------------------------------------------
// POST /api/parent/mutabaah
// Body: { itemId, tanggal, isChecked }
// Upsert satu item — dipanggil saat toggle checklist
// -----------------------------------------------------------
export async function POST(request: NextRequest) {
  try {
    const session  = await requireParentSession()
    const supabase = createServiceClient()
    const body     = await request.json()

    const { itemId, tanggal, isChecked, catatan } = body

    if (!itemId || !tanggal || typeof isChecked !== 'boolean') {
      return NextResponse.json(
        { error: 'Data tidak lengkap' },
        { status: 400 }
      )
    }

    // Cek apakah sudah terkunci
    const lockedAfter = getLockedAfter(tanggal)
    if (new Date() > new Date(lockedAfter)) {
      return NextResponse.json(
        { error: 'Mutabaah hari ini sudah terkunci setelah pukul 23:59' },
        { status: 403 }
      )
    }

    // Upsert ke mutabaah_log
    const { error } = await supabase
      .from('mutabaah_log')
      .upsert(
        {
          siswa_id:     session.siswaId,
          item_id:      itemId,
          tanggal,
          is_checked:   isChecked,
          catatan:      catatan ?? null,
          locked_after: lockedAfter,
        } as any,
        { onConflict: 'siswa_id,item_id,tanggal' }
      )

    if (error) {
      console.error('upsert mutabaah error:', error)
      return NextResponse.json(
        { error: 'Gagal menyimpan' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: 'Sesi tidak valid' }, { status: 401 })
    }
    console.error('POST mutabaah error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
