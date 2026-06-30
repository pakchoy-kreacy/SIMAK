// ============================================================
// app/api/staff/siswa/route.ts
// GET: Daftar siswa — semua untuk guru, kelas sendiri untuk wali kelas
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireStaffSession }       from '@/lib/auth/staff'
import { createServiceClient }       from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const session  = await requireStaffSession()
    const supabase = createServiceClient()
    const { searchParams } = new URL(request.url)
    const kelasId  = searchParams.get('kelasId')

    // Ambil tahun ajaran aktif
    const { data: tahunAjaran } = await supabase
      .from('tahun_ajaran')
      .select('id')
      .eq('is_active', true)
      .single()

    if (!tahunAjaran) {
      return NextResponse.json([])
    }

    // Base query: siswa + kelas mereka
    let query = supabase
      .from('siswa_kelas')
      .select(`
        siswa_id,
        kelas:kelas_id ( id, nama_kelas ),
        siswa:siswa_id ( id, nisn, nama_lengkap, photo_url, is_active )
      `)
      .eq('tahun_ajaran_id', tahunAjaran.id)

    // Non-admin: hanya siswa di kelas sendiri
    if (session.role !== 'admin') {
      const kelasQuery = supabase
        .from('kelas')
        .select('id')
        .eq('tahun_ajaran_id', tahunAjaran.id)

      if (session.role === 'guru_wafa') {
        kelasQuery.eq('guru_wafa_id', session.userId)
      } else if (session.role === 'guru_tahfiz') {
        kelasQuery.eq('guru_tahfiz_id', session.userId)
      } else {
        kelasQuery.eq('wali_kelas_id', session.userId)
      }

      const { data: kelasSaya } = await kelasQuery

      const kelasIds = kelasSaya?.map(k => k.id) ?? []
      if (kelasIds.length === 0) return NextResponse.json([])
      query = query.in('kelas_id', kelasIds)
    }

    // Filter per kelas jika ada param
    if (kelasId) {
      query = query.eq('kelas_id', kelasId)
    }

    const { data, error } = await query
    if (error) throw error

    // Flatten dan filter siswa aktif
    const siswaList = (data ?? [])
      .filter((row: any) => row.siswa?.is_active)
      .map((row: any) => ({
        id:           row.siswa.id,
        nisn:         row.siswa.nisn,
        nama_lengkap: row.siswa.nama_lengkap,
        photo_url:    row.siswa.photo_url,
        kelas_id:     row.kelas.id,
        nama_kelas:   row.kelas.nama_kelas,
      }))
      .sort((a: any, b: any) =>
        a.nama_kelas.localeCompare(b.nama_kelas) ||
        a.nama_lengkap.localeCompare(b.nama_lengkap)
      )

    return NextResponse.json(siswaList)
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    }
    console.error('GET siswa error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
