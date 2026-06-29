import { NextResponse } from 'next/server'
import { requireRole }  from '@/lib/auth/staff'
import { createServiceClient } from '@/lib/supabase/server'

export async function POST() {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()

    // Hapus semua data terkait siswa (child tables dulu — foreign key cascade)
    await supabase.from('parent_sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('mutabaah_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('tahfiz_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('wafa_log').delete().neq('id', '00000000-0000-0000-0000-000000000000')
    await supabase.from('siswa_kelas').delete().neq('id', '00000000-0000-0000-0000-000000000000')

    // Hard delete semua siswa
    const { error } = await supabase
      .from('siswa')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    console.error('delete-all error:', err)
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Gagal menghapus data' }, { status: 500 })
  }
}
