import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }       from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const { kelasId } = await request.json()

    if (!kelasId) return NextResponse.json({ error: 'kelasId wajib' }, { status: 400 })

    // Ambil semua siswa di kelas ini
    const { data: siswaKelas } = await supabase
      .from('siswa_kelas')
      .select('siswa_id')
      .eq('kelas_id', kelasId)

    if (!siswaKelas || siswaKelas.length === 0) {
      return NextResponse.json({ success: true, deleted: 0 })
    }

    const siswaIds = siswaKelas.map(sk => sk.siswa_id)

    // Hapus data terkait siswa (child tables dulu)
    await supabase.from('parent_sessions').delete().in('siswa_id', siswaIds)
    await supabase.from('mutabaah_log').delete().in('siswa_id', siswaIds)
    await supabase.from('tahfiz_log').delete().in('siswa_id', siswaIds)
    await supabase.from('wafa_log').delete().in('siswa_id', siswaIds)

    // Hard delete siswa_kelas
    await supabase.from('siswa_kelas').delete().eq('kelas_id', kelasId)

    // Hard delete siswa
    const { error } = await supabase
      .from('siswa')
      .delete()
      .in('id', siswaIds)

    if (error) throw error

    return NextResponse.json({ success: true, deleted: siswaIds.length })
  } catch (err: unknown) {
    console.error('delete-by-kelas error:', err)
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Gagal menghapus' }, { status: 500 })
  }
}
