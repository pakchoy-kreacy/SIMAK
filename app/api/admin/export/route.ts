// ============================================================
// app/api/admin/export/route.ts
// GET: Export data ke Excel
//      Query params: type, tahunId, kelasId, dateFrom, dateTo
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServerClient }        from '@/lib/supabase/server'
import * as XLSX                     from 'xlsx'

export async function GET(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)

    const type     = searchParams.get('type')     // 'mutabaah' | 'tahfiz' | 'wafa'
    const tahunId  = searchParams.get('tahunId')
    const kelasId  = searchParams.get('kelasId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo   = searchParams.get('dateTo')

    if (!type || !tahunId) {
      return NextResponse.json({ error: 'type dan tahunId diperlukan' }, { status: 400 })
    }

    // Ambil daftar siswa yang relevan
    let skQuery = supabase
      .from('siswa_kelas')
      .select('siswa_id, siswa:siswa_id(id, nisn, nama_lengkap), kelas:kelas_id(nama_kelas)')
      .eq('tahun_ajaran_id', tahunId)

    if (kelasId) skQuery = skQuery.eq('kelas_id', kelasId)

    const { data: skData } = await skQuery
    const siswaList = (skData ?? [])
      .filter((r: any) => r.siswa)
      .map((r: any) => ({
        id:           r.siswa.id,
        nisn:         r.siswa.nisn,
        nama_lengkap: r.siswa.nama_lengkap,
        nama_kelas:   (r.kelas as any)?.nama_kelas ?? '-',
      }))
      .sort((a: any, b: any) => a.nama_kelas.localeCompare(b.nama_kelas) || a.nama_lengkap.localeCompare(b.nama_lengkap))

    // Mode preview: hanya return jumlah siswa & kelas
    const isPreview = searchParams.get('preview') === '1'
    if (isPreview) {
      const kelasSet = new Set((skData ?? []).map((r: any) => (r.kelas as any)?.id).filter(Boolean))
      return NextResponse.json({ siswa: siswaList.length, kelas: kelasSet.size })
    }

    const siswaIds = siswaList.map(s => s.id)
    let wb: XLSX.WorkBook
    let filename: string

    // ---- EXPORT MUTABAAH ----
    if (type === 'mutabaah') {
      // Ambil semua item aktif
      const { data: items } = await supabase
        .from('mutabaah_item')
        .select('id, nama_item')
        .eq('tahun_ajaran_id', tahunId)
        .eq('is_active', true)
        .order('urutan')

      // Ambil semua log dalam range
      let logQuery = supabase
        .from('mutabaah_log')
        .select('siswa_id, item_id, tanggal, is_checked, catatan')
        .in('siswa_id', siswaIds)

      if (dateFrom) logQuery = logQuery.gte('tanggal', dateFrom)
      if (dateTo)   logQuery = logQuery.lte('tanggal', dateTo)

      const { data: logs } = await logQuery as any

      // Build pivot: siswa × tanggal
      type LogKey = string
      const logMap = new Map<LogKey, boolean>()
      const catatanMap = new Map<LogKey, string>()
      const dateSet = new Set<string>()
      for (const log of logs ?? []) {
        logMap.set(`${log.siswa_id}:${log.tanggal}:${log.item_id}`, log.is_checked)
        if (log.catatan) catatanMap.set(`${log.siswa_id}:${log.tanggal}:${log.item_id}`, log.catatan)
        dateSet.add(log.tanggal)
      }
      const dates = Array.from(dateSet).sort()

      const sheetData = siswaList.map(siswa => {
        const row: Record<string, unknown> = {
          'NISN':         siswa.nisn,
          'Nama Lengkap': siswa.nama_lengkap,
          'Kelas':        siswa.nama_kelas,
        }
        let totalChecked = 0, totalPossible = 0
        const catatanItems: string[] = []
        for (const tanggal of dates) {
          let dayChecked = 0
          for (const item of items ?? []) {
            const val = logMap.get(`${siswa.id}:${tanggal}:${item.id}`) ?? false
            if (val) dayChecked++
            totalPossible++
            const c = catatanMap.get(`${siswa.id}:${tanggal}:${item.id}`)
            if (c) catatanItems.push(`[${tanggal}] ${item.nama_item}: ${c}`)
          }
          totalChecked += dayChecked
          const pct = (items?.length ?? 0) > 0 ? Math.round((dayChecked / (items?.length ?? 1)) * 100) : 0
          row[tanggal] = `${pct}%`
        }
        row['Rata-rata'] = totalPossible > 0 ? `${Math.round((totalChecked / totalPossible) * 100)}%` : '0%'
        row['Catatan Tilawah'] = catatanItems.length > 0 ? catatanItems.join('; ') : ''
        return row
      })

      const ws  = XLSX.utils.json_to_sheet(sheetData)
      wb        = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Mutabaah')
      filename  = `mutabaah_${dateFrom ?? 'all'}_${dateTo ?? 'all'}.xlsx`
    }

    // ---- EXPORT TAHFIZ ----
    else if (type === 'tahfiz') {
      let q = supabase
        .from('tahfiz_log')
        .select('tanggal, surah, ayat_awal, ayat_akhir, status, catatan, siswa:siswa_id(nisn, nama_lengkap), guru:guru_id(nama)')
        .in('siswa_id', siswaIds)
        .order('tanggal', { ascending: false })

      if (dateFrom) q = q.gte('tanggal', dateFrom)
      if (dateTo)   q = q.lte('tanggal', dateTo)
      const { data: logs } = await q

      const sheetData = (logs ?? []).map((log: any) => ({
        'Tanggal':      log.tanggal,
        'NISN':         log.siswa?.nisn ?? '',
        'Nama Siswa':   log.siswa?.nama_lengkap ?? '',
        'Surah':        log.surah,
        'Ayat Awal':    log.ayat_awal ?? '',
        'Ayat Akhir':   log.ayat_akhir ?? '',
        'Status':       log.status,
        'Catatan':      log.catatan ?? '',
        'Guru':         log.guru?.nama ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(sheetData)
      wb       = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Tahfiz')
      filename = `tahfiz_${dateFrom ?? 'all'}_${dateTo ?? 'all'}.xlsx`
    }

    // ---- EXPORT WAFA ----
    else if (type === 'wafa') {
      let q = supabase
        .from('wafa_log')
        .select('tanggal, jilid, halaman, status, catatan, siswa:siswa_id(nisn, nama_lengkap), guru:guru_id(nama)')
        .in('siswa_id', siswaIds)
        .order('tanggal', { ascending: false })

      if (dateFrom) q = q.gte('tanggal', dateFrom)
      if (dateTo)   q = q.lte('tanggal', dateTo)
      const { data: logs } = await q

      const sheetData = (logs ?? []).map((log: any) => ({
        'Tanggal':    log.tanggal,
        'NISN':       log.siswa?.nisn ?? '',
        'Nama Siswa': log.siswa?.nama_lengkap ?? '',
        'Jilid':      log.jilid,
        'Halaman':    log.halaman ?? '',
        'Status':     log.status,
        'Catatan':    log.catatan ?? '',
        'Guru':       log.guru?.nama ?? '',
      }))

      const ws = XLSX.utils.json_to_sheet(sheetData)
      wb       = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Wafa')
      filename = `wafa_${dateFrom ?? 'all'}_${dateTo ?? 'all'}.xlsx`
    }
    else {
      return NextResponse.json({ error: 'Type tidak valid' }, { status: 400 })
    }

    // Stream sebagai file download
    const buf = XLSX.write(wb!, { type: 'buffer', bookType: 'xlsx' })

    return new NextResponse(buf, {
      headers: {
        'Content-Type':        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length':      String(buf.length),
      },
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('GET /api/admin/export error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat export'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
