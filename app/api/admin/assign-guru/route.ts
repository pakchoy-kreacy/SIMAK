import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServiceClient }       from '@/lib/supabase/server'

async function getKelasWithSiswa(supabase: any) {
  const { data: skRows } = await supabase.from('siswa_kelas').select('kelas_id')
  const kelasIds = Array.from(new Set((skRows ?? []).map((r: any) => r.kelas_id))).filter(Boolean) as string[]
  if (kelasIds.length === 0) return []
  const { data } = await supabase
    .from('kelas')
    .select('id, nama_kelas, tahun_ajaran_id, wali_kelas_id, guru_wafa_id, guru_tahfiz_id')
    .in('id', kelasIds)
    .order('nama_kelas')
  return data ?? []
}

export async function GET() {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()

    const [kelasData, guruRes, tahunAjaranRes] = await Promise.all([
      getKelasWithSiswa(supabase),
      supabase.from('user_profile').select('id, nama, role').neq('role', 'admin').order('nama'),
      supabase.from('tahun_ajaran').select('id, nama').order('nama'),
    ])

    return NextResponse.json({
      kelas:     kelasData,
      guru:      guruRes.data ?? [],
      tahunAjaran: tahunAjaranRes.data ?? [],
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    }
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = createServiceClient()
    const body = await request.json()
    const { assignments } = body

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json({ error: 'Data tidak valid' }, { status: 400 })
    }

    const roleAssignments: Array<{ userId: string; roles: string[] }> = []

    for (const a of assignments) {
      const { kelasId, waliKelasId, guruWafaId, guruTahfizId } = a

      if (waliKelasId !== undefined) {
        await supabase.from('kelas').update({ wali_kelas_id: waliKelasId || null }).eq('id', kelasId)
        if (waliKelasId) roleAssignments.push({ userId: waliKelasId, roles: ['wali_kelas'] })
      }

      if (guruWafaId !== undefined) {
        await supabase.from('kelas').update({ guru_wafa_id: guruWafaId || null }).eq('id', kelasId)
        if (guruWafaId) roleAssignments.push({ userId: guruWafaId, roles: ['guru_wafa'] })
      }

      if (guruTahfizId !== undefined) {
        await supabase.from('kelas').update({ guru_tahfiz_id: guruTahfizId || null }).eq('id', kelasId)
        if (guruTahfizId) roleAssignments.push({ userId: guruTahfizId, roles: ['guru_tahfiz'] })
      }
    }

    // Update user_roles for all assigned users
    for (const ra of roleAssignments) {
      for (const role of ra.roles) {
        await supabase
          .from('user_roles')
          .upsert(
            { user_id: ra.userId, role },
            { onConflict: 'user_id,role', ignoreDuplicates: false }
          )
      }
    }

    const [kelasData, guruRes, tahunAjaranRes] = await Promise.all([
      getKelasWithSiswa(supabase),
      supabase.from('user_profile').select('id, nama, role').neq('role', 'admin').order('nama'),
      supabase.from('tahun_ajaran').select('id, nama').order('nama'),
    ])

    return NextResponse.json({
      success: true,
      kelas:     kelasData,
      guru:      guruRes.data ?? [],
      tahunAjaran: tahunAjaranRes.data ?? [],
    })
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      if (err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    }
    console.error('assign-guru POST error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
