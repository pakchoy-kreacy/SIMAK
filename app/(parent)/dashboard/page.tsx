// ============================================================
// app/(parent)/dashboard/page.tsx
// Dashboard orang tua — Server Component untuk initial data fetch
// ============================================================

import { getParentSession }  from '@/lib/auth/parent'
import { createServiceClient } from '@/lib/supabase/server'
import { getTodayWIB, getLockedAfter, formatTanggal } from '@/lib/utils/date'
import { DashboardClient }   from './DashboardClient'
import type { MutabaahDayData, MutabaahItemWithStatus } from '@/lib/types/app'
import { redirect }          from 'next/navigation'

export default async function DashboardPage() {
  const session = await getParentSession()
  if (!session) redirect('/login')

  const supabase = createServiceClient()
  const tanggal  = getTodayWIB()

  // Fetch tahun ajaran aktif
  const { data: tahunAjaran } = await supabase
    .from('tahun_ajaran')
    .select('id')
    .eq('is_active', true)
    .single()

  let initialMutabaah: MutabaahDayData = {
    tanggal,
    items:      [],
    percentage: 0,
    is_locked:  false,
  }

  if (tahunAjaran) {
    // Fetch item mutabaah aktif dengan parent_id
    // Fallback: jika parent_id belum ada di DB, query tetap jalan
    let items: Array<{ id: string; nama_item: string; urutan: number; parent_id: string | null }> = []
    const { data: itemsData, error: itemsError } = await supabase
      .from('mutabaah_item')
      .select('id, nama_item, urutan, parent_id')
      .eq('tahun_ajaran_id', tahunAjaran.id)
      .eq('is_active', true)
      .order('urutan', { ascending: true })

    if (itemsError && itemsError.message?.includes('parent_id')) {
      const { data: fallbackItems } = await supabase
        .from('mutabaah_item')
        .select('id, nama_item, urutan')
        .eq('tahun_ajaran_id', tahunAjaran.id)
        .eq('is_active', true)
        .order('urutan', { ascending: true })
      items = (fallbackItems ?? []).map(i => ({ ...i, parent_id: null }))
    } else {
      items = itemsData ?? []
    }

    // Filter by kelas items (guru pilih item yang berlaku)
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
        const activeSet = new Set(kelasItems.map(k => k.mutabaah_item_id))
        const keepIds = new Set<string>()
        for (const i of items) {
          if (activeSet.has(i.id)) {
            keepIds.add(i.id)
            if (i.parent_id) keepIds.add(i.parent_id)
          }
        }
        items = items.filter(i => keepIds.has(i.id))
      }
    }

    // Fetch log hari ini
    const { data: logs } = await supabase
      .from('mutabaah_log')
      .select('item_id, is_checked, catatan')
      .eq('siswa_id', session.siswaId)
      .eq('tanggal', tanggal) as any

    const lockedAfter = getLockedAfter(tanggal)
    const isLocked    = new Date() > new Date(lockedAfter)
    const logMap      = new Map((logs as any[])?.map((l: any) => [l.item_id, { is_checked: l.is_checked, catatan: l.catatan }]) ?? [])

    const allItems: MutabaahItemWithStatus[] = items.map(item => ({
      id:         item.id,
      nama_item:  item.nama_item,
      urutan:     item.urutan,
      is_checked: logMap.get(item.id)?.is_checked ?? false,
      is_locked:  isLocked,
      parent_id:  item.parent_id,
      tipe:       (item as any).tipe ?? 'checkbox',
      catatan:    logMap.get(item.id)?.catatan ?? null,
    }))

    // Build hierarchy: parent → children
    const parentItems = allItems.filter(i => !i.parent_id)
    const childItems  = allItems.filter(i => i.parent_id)

    // Attach children to parents
    for (const parent of parentItems) {
      parent.children = childItems.filter(c => c.parent_id === parent.id)
    }

    // Items without children (flat items) — treat as parent with empty children
    const hierarchicalItems = parentItems.map(p => ({
      ...p,
      children: p.children ?? [],
    }))

    // Calculate percentage based on leaf items only (children, not parents)
    const leafItems    = hierarchicalItems.flatMap(p => p.children.length > 0 ? p.children : [p])
    const totalItems   = leafItems.length
    const checkedItems = leafItems.filter(i => i.is_checked).length
    const percentage   = totalItems > 0
      ? Math.round((checkedItems / totalItems) * 100)
      : 0

    initialMutabaah = {
      tanggal,
      items:      hierarchicalItems,
      percentage,
      is_locked:  isLocked,
    }
  }

  // Fetch summary tahfiz terakhir
  const { data: tahfizLast } = await supabase
    .from('tahfiz_log')
    .select('surah, ayat_awal, ayat_akhir, status, tanggal')
    .eq('siswa_id', session.siswaId)
    .order('tanggal', { ascending: false })
    .limit(1)
    .single()

  // Fetch summary wafa terakhir
  const { data: wafaLast } = await supabase
    .from('wafa_log')
    .select('jilid, halaman, status, tanggal')
    .eq('siswa_id', session.siswaId)
    .order('tanggal', { ascending: false })
    .limit(1)
    .single()

  // Fetch kelas siswa
  const { data: tahunAktif } = await supabase
    .from('tahun_ajaran')
    .select('id')
    .eq('is_active', true)
    .single()

  let namaKelas = ''
  if (tahunAktif) {
    const { data: kelasData } = await supabase
      .from('siswa_kelas')
      .select('kelas:kelas_id(nama_kelas)')
      .eq('siswa_id', session.siswaId)
      .eq('tahun_ajaran_id', tahunAktif.id)
      .single()
    namaKelas = (kelasData?.kelas as any)?.nama_kelas ?? ''
  }

  return (
    <DashboardClient
      siswaName={session.siswaName}
      namaKelas={namaKelas}
      tanggalLabel={formatTanggal(tanggal)}
      initialMutabaah={initialMutabaah}
      tahfizLast={tahfizLast ?? null}
      wafaLast={wafaLast ?? null}
    />
  )
}
