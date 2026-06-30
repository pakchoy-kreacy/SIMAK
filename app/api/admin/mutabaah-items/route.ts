// ============================================================
// app/api/admin/mutabaah-items/route.ts
// GET:  Item mutabaah per tahun ajaran
// POST: Tambah item baru (supports parent + subItems array)
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { requireRole }               from '@/lib/auth/staff'
import { createServerClient }        from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const { searchParams } = new URL(request.url)
    const tahunId = searchParams.get('tahunId')

    let query = supabase
      .from('mutabaah_item')
      .select('id, nama_item, parent_id, urutan, is_active, tahun_ajaran_id, tipe, tahun_ajaran:tahun_ajaran_id(nama)')
      .order('urutan', { ascending: true })

    if (tahunId) query = query.eq('tahun_ajaran_id', tahunId)

    let raw: any[] | null = null
    let queryError = null
    try {
      const res = await query
      raw = res.data as any[]
      queryError = res.error
    } catch (e) {
      queryError = e
    }

    // Fallback kalau kolom tipe belum ada di database
    if (queryError) {
      const errMsg = queryError instanceof Error ? queryError.message : String(queryError)
      console.warn('mutabaah_items query dengan tipe gagal, fallback tanpa tipe:', errMsg)
      let fallbackQuery = supabase
        .from('mutabaah_item')
        .select('id, nama_item, parent_id, urutan, is_active, tahun_ajaran_id, tahun_ajaran:tahun_ajaran_id(nama)')
        .order('urutan', { ascending: true })
      if (tahunId) fallbackQuery = fallbackQuery.eq('tahun_ajaran_id', tahunId)
      const { data: fallbackRaw, error: fallbackError } = await fallbackQuery
      if (fallbackError) throw fallbackError
      raw = fallbackRaw as any[]
    }

    const data: any[] = raw ?? []
    const itemIds = data.map(i => i.id)
    // Map: itemId → [{ kelas_id, kelas_nama }]
    let kelasMap = new Map<string, { kelas_id: string; kelas_nama: string }[]>()
    if (itemIds.length > 0) {
      const { data: kelasItems } = await supabase
        .from('kelas_mutabaah_item')
        .select('mutabaah_item_id, kelas_id, kelas:kelas_id(nama_kelas)')
        .in('mutabaah_item_id', itemIds)
      if (kelasItems) {
        for (const ki of kelasItems) {
          const arr = kelasMap.get(ki.mutabaah_item_id) ?? []
          arr.push({ kelas_id: ki.kelas_id, kelas_nama: (ki.kelas as any)?.nama_kelas ?? '-' })
          kelasMap.set(ki.mutabaah_item_id, arr)
        }
      }
    }

    const result = (data ?? []).map(i => ({
      ...i,
      jumlah_kelas: kelasMap.get(i.id)?.length ?? 0,
      kelas_list:   kelasMap.get(i.id) ?? [],
    }))

    return NextResponse.json(result)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('GET /api/admin/mutabaah-items error:', err)
    const message = err instanceof Error ? err.message : 'Terjadi kesalahan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// PATCH: Assign item ke satu atau lebih kelas
// Body: { assignItemId, kelasIds: string[] }
export async function PATCH(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const body = await request.json()
    const { assignItemId, kelasIds } = body as { assignItemId: string; kelasIds: string[] }

    if (!assignItemId || !kelasIds?.length) {
      return NextResponse.json({ error: 'itemId dan kelasIds wajib diisi' }, { status: 400 })
    }

    const inserts = kelasIds.map(kelasId => ({
      mutabaah_item_id: assignItemId,
      kelas_id: kelasId,
    }))

    // Also include children of this item (if it's a parent)
    const { data: childItems } = await supabase
      .from('mutabaah_item')
      .select('id')
      .eq('parent_id', assignItemId)
      .eq('is_active', true)

    if (childItems?.length) {
      for (const child of childItems) {
        for (const kelasId of kelasIds) {
          inserts.push({ mutabaah_item_id: child.id, kelas_id: kelasId })
        }
      }
    }

    // Deduplicate
    const seen = new Set<string>()
    const deduped = inserts.filter(ins => {
      const key = `${ins.mutabaah_item_id}:${ins.kelas_id}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    const { error } = await supabase
      .from('kelas_mutabaah_item')
      .upsert(deduped, { onConflict: 'mutabaah_item_id,kelas_id' })

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    console.error('PATCH /api/admin/mutabaah-items error:', err)
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// DELETE: Unassign kelas dari item mutabaah
// Body: { itemId, kelasId } untuk hapus satu assignment
// Body: { itemId } untuk hapus semua assignment item tersebut
export async function DELETE(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const body     = await request.json()
    const { itemId, kelasId } = body as { itemId: string; kelasId?: string }

    if (!itemId) {
      return NextResponse.json({ error: 'itemId wajib diisi' }, { status: 400 })
    }

    let query = supabase.from('kelas_mutabaah_item').delete().eq('mutabaah_item_id', itemId)
    if (kelasId) query = query.eq('kelas_id', kelasId)

    const { error } = await query
    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')    return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}

// Helper — insert satu item, return data atau throw
async function insertMutabaahItem(
  supabase: Awaited<ReturnType<typeof createServerClient>>,
  payload: { nama_item: string; tahun_ajaran_id: string; parent_id: string | null; urutan: number; tipe?: string },
) {
  const { data, error } = await supabase
    .from('mutabaah_item')
    .insert({ nama_item: payload.nama_item, tahun_ajaran_id: payload.tahun_ajaran_id, parent_id: payload.parent_id, urutan: payload.urutan, tipe: payload.tipe ?? 'checkbox' } as any)
    .select()
    .single()
  if (error) {
    if (error.code === '23505') throw new Error('DUPLICATE_ITEM')
    throw error
  }
  return data
}

export async function POST(request: NextRequest) {
  try {
    await requireRole(['admin'])
    const supabase = await createServerClient()
    const body     = await request.json()
    const { namaItem, tahunAjaranId, parentId, subItems, tipe } = body as {
      namaItem:       string
      tahunAjaranId:  string
      parentId:       string | null
      subItems?:      string[]
      tipe?:          string
    }

    if (!namaItem?.trim() || !tahunAjaranId) {
      return NextResponse.json({ error: 'Nama item dan tahun ajaran wajib diisi' }, { status: 400 })
    }

    // Validasi hierarki: max 2 level (parent → child)
    if (parentId) {
      // Cek parent-nya punya parent_id atau tidak
      const { data: parent } = await supabase
        .from('mutabaah_item')
        .select('parent_id')
        .eq('id', parentId)
        .single()
      if (!parent) return NextResponse.json({ error: 'Item induk tidak ditemukan' }, { status: 404 })
      if (parent.parent_id) {
        return NextResponse.json({ error: 'Maksimal 2 level hierarki (Induk → Sub)' }, { status: 400 })
      }
    }

    // Cek duplikat nama dalam parent & tahun ajaran yang sama
    let dupQuery = supabase
      .from('mutabaah_item')
      .select('id')
      .eq('nama_item', namaItem.trim())
      .eq('tahun_ajaran_id', tahunAjaranId)

    if (parentId) {
      dupQuery = dupQuery.eq('parent_id', parentId)
    } else {
      dupQuery = dupQuery.is('parent_id', null)
    }

    const { data: existing } = await dupQuery.maybeSingle()
    if (existing) {
      return NextResponse.json({ error: 'Nama item sudah ada di tingkat ini' }, { status: 409 })
    }

    // Ambil urutan tertinggi (use maybeSingle to handle empty)
    let urutanQuery = supabase
      .from('mutabaah_item')
      .select('urutan')
      .eq('tahun_ajaran_id', tahunAjaranId)
      .order('urutan', { ascending: false })
      .limit(1)

    if (parentId) {
      urutanQuery = urutanQuery.eq('parent_id', parentId)
    } else {
      urutanQuery = urutanQuery.is('parent_id', null)
    }

    const { data: lastItem } = await urutanQuery.maybeSingle()
    let nextUrutan = (lastItem?.urutan ?? 0) + 1

    // Insert parent item
    const newItem = await insertMutabaahItem(supabase, {
      nama_item:       namaItem.trim(),
      tahun_ajaran_id: tahunAjaranId,
      parent_id:       parentId || null,
      urutan:          nextUrutan,
      tipe,
    })

    // Insert sub-items if provided (batch — parent_id guaranteed correct)
    let createdSubCount = 0
    if (parentId === null && Array.isArray(subItems) && subItems.length > 0) {
      for (const sub of subItems) {
        if (!sub?.trim()) continue
        nextUrutan++
        try {
          await insertMutabaahItem(supabase, {
            nama_item:       sub.trim(),
            tahun_ajaran_id: tahunAjaranId,
            parent_id:       newItem.id,
            urutan:          nextUrutan,
          })
          createdSubCount++
        } catch {
          // If a sub fails, we still return success with partial count
        }
      }
    }

    const msg = createdSubCount > 0
      ? `Item ditambahkan dengan ${createdSubCount} sub item`
      : 'Item berhasil ditambahkan'

    return NextResponse.json({ success: true, data: newItem, message: msg })
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED')     return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (err instanceof Error && err.message === 'FORBIDDEN')        return NextResponse.json({ error: 'Forbidden' },    { status: 403 })
    if (err instanceof Error && err.message === 'DUPLICATE_ITEM')   return NextResponse.json({ error: 'Item sudah ada di tahun ajaran ini' }, { status: 409 })
    return NextResponse.json({ error: 'Terjadi kesalahan' }, { status: 500 })
  }
}
