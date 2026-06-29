import { NextResponse } from 'next/server'
import { requireRole }  from '@/lib/auth/staff'
import { createServiceClient } from '@/lib/supabase/server'
import { deleteOrphanKelas } from '@/lib/utils/kelas-cleanup'

export async function POST() {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()

    // Hapus semua data terkait siswa (parallel — child tables dulu)
    const childResults = await Promise.all([
      supabase.from('parent_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('mutabaah_log').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('tahfiz_log').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('wafa_log').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
      supabase.from('siswa_kelas').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
    ])

    const childError = childResults.find(r => r.error)
    if (childError) throw childError.error

    // Hard delete semua siswa
    const { error } = await supabase
      .from('siswa')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) throw error

    // Hapus kelas yang tidak punya siswa (derived view)
    await deleteOrphanKelas(supabase)

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('delete-all error:', err)
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}
