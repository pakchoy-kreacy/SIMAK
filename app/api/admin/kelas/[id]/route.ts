// ============================================================
// app/api/admin/kelas/[id]/route.ts
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServerClient }        from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { id }   = await params
    const body     = await request.json()
    const { namaKelas, waliKelasId } = body

    const updates: Record<string, unknown> = {}
    if (namaKelas   !== undefined) updates.nama_kelas    = namaKelas.trim()
    if (waliKelasId !== undefined) updates.wali_kelas_id = waliKelasId || null

    const { error } = await supabase.from('kelas').update(updates as never).eq('id', id)
    if (error) {
      if (error.code === '23505') return NextResponse.json({ error: 'Nama kelas sudah ada' }, { status: 409 })
      throw error
    }
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { id }   = await params

    // Cek apakah ada siswa di kelas ini (tahun ajaran yang sama)
    const { data: kelas } = await supabase
      .from('kelas').select('tahun_ajaran_id').eq('id', id).single()

    if (kelas) {
      const { count } = await supabase
        .from('siswa_kelas').select('*', { count: 'exact', head: true })
        .eq('kelas_id', id).eq('tahun_ajaran_id', kelas.tahun_ajaran_id)

      if ((count ?? 0) > 0) {
        return NextResponse.json({ error: 'Kelas masih memiliki siswa, tidak dapat dihapus' }, { status: 409 })
      }
    }

    const { error } = await supabase.from('kelas').delete().eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
