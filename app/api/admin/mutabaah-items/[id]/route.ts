// ============================================================
// app/api/admin/mutabaah-items/[id]/route.ts
// PATCH:  Edit nama / toggle aktif / reorder / reparent
// DELETE: Soft delete (arsipkan) or permanent (hapus)
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
    const { namaItem, isActive, urutan, parentId, tipe } = body as {
      namaItem?: string
      isActive?: boolean
      urutan?:   number
      parentId?: string | null
      tipe?:     string
    }

    // Fetch item saat ini
    const { data: currentItem } = await supabase
      .from('mutabaah_item')
      .select('id, nama_item, parent_id, tahun_ajaran_id')
      .eq('id', id)
      .single()
    if (!currentItem) return NextResponse.json({ error: 'Item tidak ditemukan' }, { status: 404 })

    const updates: Record<string, unknown> = {}
    if (namaItem !== undefined) updates.nama_item = namaItem.trim()
    if (isActive !== undefined) updates.is_active = isActive
    if (urutan   !== undefined) updates.urutan    = urutan
    if (tipe     !== undefined) updates.tipe      = tipe

    // ── Reparent (pindahkan) ──
    if (parentId !== undefined) {
      const newParentId = parentId || null

      // Tidak boleh jadikan dirinya sendiri sebagai induk
      if (newParentId === id) {
        return NextResponse.json({ error: 'Item tidak bisa menjadi induk dirinya sendiri' }, { status: 400 })
      }

      if (newParentId) {
        // Cek parent-nya ada
        const { data: parentItem } = await supabase
          .from('mutabaah_item')
          .select('id, parent_id, tahun_ajaran_id')
          .eq('id', newParentId)
          .single()
        if (!parentItem) return NextResponse.json({ error: 'Item induk tujuan tidak ditemukan' }, { status: 404 })

        // Harus satu tahun ajaran
        if (parentItem.tahun_ajaran_id !== currentItem.tahun_ajaran_id) {
          return NextResponse.json({ error: 'Induk tujuan harus satu tahun ajaran' }, { status: 400 })
        }

        // Induk tujuan tidak boleh punya parent sendiri (max 2 level)
        if (parentItem.parent_id) {
          return NextResponse.json({ error: 'Maksimal 2 level hierarki (Induk → Sub)' }, { status: 400 })
        }

        // Tidak boleh dipindahkan ke bawah dirinya sendiri
        if (newParentId === id) {
          return NextResponse.json({ error: 'Tidak bisa dipindahkan ke bawah dirinya sendiri' }, { status: 400 })
        }

        // Cek duplikat nama di parent tujuan
        const { data: dupItem } = await supabase
          .from('mutabaah_item')
          .select('id')
          .eq('nama_item', (namaItem ?? '').trim() || currentItem.nama_item)
          .eq('parent_id', newParentId)
          .eq('tahun_ajaran_id', currentItem.tahun_ajaran_id)
          .maybeSingle()
        if (dupItem && dupItem.id !== id) {
          return NextResponse.json({ error: 'Nama item sudah ada di lokasi tujuan' }, { status: 409 })
        }
      }

      updates.parent_id = newParentId
    }

    const { error } = await supabase.from('mutabaah_item').update(updates as never).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: Params) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { id }   = await params
    const { searchParams } = new URL(request.url)
    const permanent = searchParams.get('permanent') === 'true'

    if (permanent) {
      // Ambil semua anak (sub item)
      const { data: children } = await supabase
        .from('mutabaah_item').select('id').eq('parent_id', id)
      const childIds = children?.map(c => c.id) || []
      const allIds   = [id, ...childIds]

      // Hapus log terkait
      if (allIds.length > 0) {
        const { error: logErr } = await supabase
          .from('mutabaah_log').delete().in('item_id', allIds)
        if (logErr) throw logErr
      }

      // Hapus sub item
      if (childIds.length > 0) {
        const { error: childErr } = await supabase
          .from('mutabaah_item').delete().in('id', childIds)
        if (childErr) throw childErr
      }

      // Hapus item utama
      const { error } = await supabase
        .from('mutabaah_item').delete().eq('id', id)
      if (error) throw error
      return NextResponse.json({ success: true })
    }

    // Soft delete — arsipkan, preservasi riwayat
    const { error } = await supabase
      .from('mutabaah_item').update({ is_active: false }).eq('id', id)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
