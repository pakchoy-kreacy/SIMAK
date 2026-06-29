// ============================================================
// app/api/admin/import/route.ts
// POST: Import siswa dari Excel (.xlsx)
//       Body: FormData dengan file + tahunAjaranId + kelasId (opsional)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }      from '@/lib/supabase/server'
import { deleteOrphanKelas }         from '@/lib/utils/kelas-cleanup'
import * as XLSX                     from 'xlsx'

interface SiswaRow {
  nisn:         string
  nama_lengkap: string
  parent_name?: string
  parent_phone?: string
  nama_kelas?:  string
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const formData = await request.formData()
    const file     = formData.get('file') as File | null
    const tahunId  = formData.get('tahunId') as string | null
    const preview  = formData.get('preview') === 'true'

    if (!file) return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 })
    if (!tahunId) return NextResponse.json({ error: 'Tahun ajaran wajib dipilih' }, { status: 400 })

    // Parse Excel
    const buffer  = await file.arrayBuffer()
    const wb      = XLSX.read(buffer, { type: 'array' })
    const ws      = wb.Sheets[wb.SheetNames[0]]
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })

    // Normalize kolom (case-insensitive)
    const rows: SiswaRow[] = rawRows.map(row => {
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        normalized[k.toLowerCase().replace(/\s+/g, '_')] = String(v).trim()
      }
      return {
        nisn:         normalized['nisn']         ?? normalized['no_nisn'] ?? '',
        nama_lengkap: normalized['nama_lengkap'] ?? normalized['nama']    ?? '',
        parent_name:  normalized['nama_orang_tua'] ?? normalized['parent_name'] ?? '',
        parent_phone: normalized['no_hp'] ?? normalized['parent_phone'] ?? normalized['telepon'] ?? '',
        nama_kelas:   normalized['kelas'] ?? normalized['nama_kelas'] ?? '',
      }
    })

    // Validasi setiap baris
    const errors: string[] = []
    const valid: SiswaRow[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rowNum = i + 2 // Excel row (1=header)
      if (!row.nisn) { errors.push(`Baris ${rowNum}: NISN kosong`); continue }
      if (!/^\d{10}$/.test(row.nisn)) { errors.push(`Baris ${rowNum}: NISN "${row.nisn}" tidak valid (harus 10 digit)`); continue }
      if (!row.nama_lengkap) { errors.push(`Baris ${rowNum}: Nama lengkap kosong`); continue }
      valid.push(row)
    }

    // Mode preview — return data tanpa simpan
    if (preview) {
      return NextResponse.json({
        total: rows.length,
        valid: valid.length,
        errors,
        preview: valid.slice(0, 5),
      })
    }

    if (valid.length === 0) {
      return NextResponse.json({ error: 'Tidak ada data valid untuk diimport', errors }, { status: 400 })
    }

    // Ambil semua kelas tahun ini untuk mapping nama kelas
    const { data: kelasList } = await supabase
      .from('kelas')
      .select('id, nama_kelas')
      .eq('tahun_ajaran_id', tahunId)

    let kelasMap = new Map(kelasList?.map(k => [k.nama_kelas.toLowerCase(), k.id]) ?? [])

    // Auto-create kelas yang belum ada di database
    const kelasInExcel = new Set(valid.map(r => r.nama_kelas?.toLowerCase()).filter(Boolean))
    for (const namaKelas of kelasInExcel) {
      if (namaKelas && !kelasMap.has(namaKelas)) {
        const { data: newKelas } = await supabase
          .from('kelas')
          .insert({ nama_kelas: namaKelas, tahun_ajaran_id: tahunId })
          .select('id, nama_kelas')
          .single()
        if (newKelas) {
          kelasMap.set(newKelas.nama_kelas.toLowerCase(), newKelas.id)
        }
      }
    }

    // Cek NISN yang sudah ada
    const nisnList = valid.map(r => r.nisn)
    const { data: existing } = await supabase
      .from('siswa').select('nisn').in('nisn', nisnList)
    const existingNisn = new Set(existing?.map(s => s.nisn) ?? [])

    const toInsert = valid.filter(r => !existingNisn.has(r.nisn))
    const skipped  = valid.filter(r =>  existingNisn.has(r.nisn))

    let inserted = 0
    const insertErrors: string[] = []

    // Bulk insert siswa baru
    if (toInsert.length > 0) {
      const { data: newSiswa, error: insertErr } = await supabase
        .from('siswa')
        .insert(toInsert.map(r => ({
          nisn:         r.nisn,
          nama_lengkap: r.nama_lengkap,
          parent_name:  r.parent_name || null,
          parent_phone: r.parent_phone || null,
        })))
        .select('id, nisn, nama_lengkap')

      if (insertErr) throw insertErr
      inserted = newSiswa?.length ?? 0

      // Assign ke kelas berdasarkan nama_kelas di Excel
      const siswaKelasRows = []
      for (const siswa of newSiswa ?? []) {
        const row     = toInsert.find(r => r.nisn === siswa.nisn)
        const kelasNm = row?.nama_kelas?.toLowerCase()
        const kelasId = kelasNm ? kelasMap.get(kelasNm) : null
        if (kelasId) {
          siswaKelasRows.push({ siswa_id: siswa.id, kelas_id: kelasId, tahun_ajaran_id: tahunId })
        }
      }

      if (siswaKelasRows.length > 0) {
        const { error: skError } = await supabase.from('siswa_kelas').insert(siswaKelasRows)
        if (skError) throw skError
      }
    }

    // Hapus kelas yang tidak punya siswa (derived view)
    await deleteOrphanKelas(supabase)

    return NextResponse.json({
      success: true,
      inserted,
      skipped:     skipped.length,
      skippedNisn: skipped.map(s => s.nisn),
      errors:      [...errors, ...insertErrors],
    })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('POST /api/admin/import:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan saat import'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
