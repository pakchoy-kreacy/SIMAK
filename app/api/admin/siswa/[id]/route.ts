// ============================================================
// app/api/admin/siswa/[id]/route.ts
// GET:    Detail satu siswa
// PATCH:  Edit siswa
// DELETE: Deactivate siswa (soft delete)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServerClient }        from '@/lib/supabase/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { id }   = await params

    const { data, error } = await supabase
      .from('siswa')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) return NextResponse.json({ error: 'Siswa tidak ditemukan' }, { status: 404 })
    return NextResponse.json(data)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { id }   = await params
    const body     = await request.json()
    const { namaLengkap, jenisKelamin, parentName, parentPhone, kelasId } = body

    const updates: Record<string, unknown> = {}
    if (namaLengkap   !== undefined) updates.nama_lengkap   = namaLengkap
    if (jenisKelamin  !== undefined) updates.jenis_kelamin  = jenisKelamin || null
    if (parentName    !== undefined) updates.parent_name    = parentName || null
    if (parentPhone   !== undefined) updates.parent_phone   = parentPhone || null

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from('siswa').update(updates as never).eq('id', id)
      if (error) throw error
    }

    // Update kelas jika ada
    if (kelasId !== undefined) {
      const { data: kelas } = await supabase
        .from('kelas').select('tahun_ajaran_id').eq('id', kelasId).single()
      if (kelas) {
        await supabase.from('siswa_kelas')
          .upsert(
            { siswa_id: id, kelas_id: kelasId, tahun_ajaran_id: kelas.tahun_ajaran_id },
            { onConflict: 'siswa_id,tahun_ajaran_id' }
          )
      }
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

    // Soft delete — set is_active = false
    const { error } = await supabase
      .from('siswa').update({ is_active: false }).eq('id', id)
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
