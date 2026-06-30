'use client'

import { useState, useMemo, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast }            from '@/components/ui/Toast'
import { Breadcrumb }          from '@/components/ui/Breadcrumb'
import { cn }                  from '@/lib/utils/cn'

interface KelasInfo { kelas_id: string; kelas_nama: string }

interface ItemRow {
  id:              string
  nama_item:       string
  parent_id:       string | null
  urutan:          number
  is_active:       boolean
  tahun_ajaran_id: string
  tipe:            string
  jumlah_kelas:    number
  kelas_list:      KelasInfo[]
}

interface TahunItem { id: string; nama: string; is_active: boolean }

export default function AdminMutabaahItemsPage() {
  const queryClient = useQueryClient()
  const [selectedTahun, setSelectedTahun] = useState('')
  const { showToast, ToastComponent } = useToast()

  // Modal Tambah/Edit Item Utama
  const [showMainForm, setShowMainForm] = useState(false)
  const [editItem,     setEditItem]     = useState<ItemRow | null>(null)

  // Modal Tambah Sub Item
  const [showSubForm,    setShowSubForm]    = useState(false)
  const [subParentId,    setSubParentId]    = useState('')
  const [subParentNama,  setSubParentNama]  = useState('')

  // Modal Pindahkan
  const [showMoveModal, setShowMoveModal] = useState(false)
  const [moveItem,      setMoveItem]      = useState<ItemRow | null>(null)
  const [moveTargetParent, setMoveTargetParent] = useState('')

  // Modal Terapkan ke Kelas
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignItemId,    setAssignItemId]    = useState('')
  const [selectedKelas,   setSelectedKelas]   = useState<string[]>([])
  const [assignLoad,      setAssignLoad]      = useState(false)

  // Expanded class card
  const [expandedKelas, setExpandedKelas] = useState<string | null>(null)

  // Form state
  const [formNama,   setFormNama]   = useState('')
  const [formTipe,   setFormTipe]   = useState('checkbox')
  const [formSubTipe, setFormSubTipe] = useState('checkbox')
  const [subItems,   setSubItems]   = useState<string[]>([''])
  const [formLoad,   setFormLoad]   = useState(false)
  const [confirmDel, setConfirmDel] = useState<string | null>(null)
  const [confirmHapus, setConfirmHapus] = useState<string | null>(null)
  const [confirmUnassignItem, setConfirmUnassignItem] = useState<ItemRow | null>(null)

  // Collapse state per parent
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { data: tahunList = [] } = useQuery<TahunItem[]>({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => { const r = await fetch('/api/admin/tahun-ajaran'); if (!r.ok) throw new Error('Gagal'); return r.json() },
    staleTime: 60000,
  })

  const { data: kelasList = [] } = useQuery<{ id: string; nama_kelas: string; jumlah_siswa: number }[]>({
    queryKey: ['admin-kelas'],
    queryFn: async () => {
      const r = await fetch('/api/admin/kelas')
      if (!r.ok) throw new Error('Gagal')
      return r.json()
    },
    staleTime: 30000,
  })

  const { data: items = [], isLoading } = useQuery<ItemRow[]>({
    queryKey: ['mutabaah-items', selectedTahun],
    queryFn: async () => {
      const r = await fetch(`/api/admin/mutabaah-items${selectedTahun ? `?tahunId=${selectedTahun}` : ''}`)
      if (!r.ok) throw new Error('Gagal')
      return r.json()
    },
    staleTime: 30000,
    enabled: !!selectedTahun,
  })

  // Set initial selected tahun once list loads
  useEffect(() => {
    if (!selectedTahun && tahunList.length > 0) {
      const aktif = tahunList.find((t: any) => t.is_active)
      setSelectedTahun(aktif?.id ?? tahunList[0]?.id ?? '')
    }
  }, [tahunList, selectedTahun])

  const groupedItems = useMemo(() => {
    const parents = items.filter(i => !i.parent_id && i.is_active)
    const children = items.filter(i => i.parent_id && i.is_active)
    return parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_id === p.id),
    }))
  }, [items])

  const inactiveItems = items.filter(i => !i.is_active)
  const parentItems = items.filter(i => !i.parent_id && i.is_active)

  function openMainForm() {
    setEditItem(null)
    setFormNama('')
    setFormTipe('checkbox')
    setSubItems([''])
    setShowMainForm(true)
  }

  function openEditForm(item: ItemRow) {
    setEditItem(item)
    setFormNama(item.nama_item)
    setFormTipe(item.tipe ?? 'checkbox')
    setSubItems([])
    setShowMainForm(true)
  }

  function openSubForm(parentId: string, parentNama: string) {
    setFormNama('')
    setFormSubTipe('checkbox')
    setSubParentId(parentId)
    setSubParentNama(parentNama)
    setShowSubForm(true)
  }

  function openMoveModal(item: ItemRow) {
    setMoveItem(item)
    setMoveTargetParent(item.parent_id || '')
    setShowMoveModal(true)
  }

  async function handleSubmitMain(e: React.FormEvent) {
    e.preventDefault()
    if (!formNama.trim() || !selectedTahun) return
    setFormLoad(true)

    // Edit mode
    if (editItem) {
      const res = await fetch(`/api/admin/mutabaah-items/${editItem.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaItem: formNama, tipe: formTipe }),
      })
      if (res.ok) { showToast('Item diperbarui', 'success'); setShowMainForm(false); queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false }) }
      else { const d = await res.json(); showToast(d.error ?? 'Gagal', 'error') }
      setFormLoad(false)
      return
    }

    // Create mode — send parent + subItems in one request
    const validSubs = subItems.filter(s => s.trim())
    const payload = {
      namaItem:      formNama,
      tahunAjaranId: selectedTahun,
      parentId:      null,
      tipe:          formTipe,
      subItems:      validSubs.length > 0 ? validSubs : undefined,
    }

    const res = await fetch('/api/admin/mutabaah-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      const data = await res.json()
      showToast(data.message || 'Item ditambahkan', 'success')
      setShowMainForm(false)
      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
    setFormLoad(false)
  }

  async function handleSubmitSub(e: React.FormEvent) {
    e.preventDefault()
    if (!formNama.trim() || !selectedTahun) return
    setFormLoad(true)

    const payload = { namaItem: formNama, tahunAjaranId: selectedTahun, parentId: subParentId || null, tipe: formSubTipe }

    const res = await fetch('/api/admin/mutabaah-items', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) {
      showToast('Sub item ditambahkan', 'success')
      setShowSubForm(false)
      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
    setFormLoad(false)
  }

  async function handleSubmitMove() {
    if (!moveItem) return
    setFormLoad(true)

    const payload: Record<string, unknown> = {}
    if (moveTargetParent) payload.parentId = moveTargetParent
    else payload.parentId = null  // Jadikan item induk

    const res = await fetch(`/api/admin/mutabaah-items/${moveItem.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      showToast('Item berhasil dipindahkan', 'success')
      setShowMoveModal(false)
      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal memindahkan', 'error')
    }
    setFormLoad(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/mutabaah-items/${id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Item diarsipkan', 'success'); setConfirmDel(null); queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false }) }
    else showToast('Gagal', 'error')
  }

  async function handleHapus(id: string) {
    const res = await fetch(`/api/admin/mutabaah-items/${id}?permanent=true`, { method: 'DELETE' })
    if (res.ok) { showToast('Item dihapus permanen', 'success'); setConfirmHapus(null); queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false }) }
    else { const d = await res.json(); showToast(d.error ?? 'Gagal', 'error') }
  }

  async function handleUnassign(itemId: string, kelasId: string, kelasNama: string) {
    const res = await fetch('/api/admin/mutabaah-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, kelasId }),
    })
    if (res.ok) {
      showToast(`Lepas dari ${kelasNama} berhasil`, 'success')
      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
  }

  async function handleUnassignAll(item: ItemRow) {
    const res = await fetch('/api/admin/mutabaah-items', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: item.id }),
    })
    if (res.ok) {
      showToast(`Semua kelas dilepas dari ${item.nama_item}`, 'success')
      setConfirmUnassignItem(null)
      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal melepas semua kelas', 'error')
    }
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-14 md:top-0 z-30">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-neutral-800">Template Mutabaah</h2>
          <button onClick={openMainForm} className="h-9 px-3 bg-primary-500 text-white text-xs font-semibold rounded-lg">+ Tambah</button>
        </div>
        <select value={selectedTahun} onChange={e => setSelectedTahun(e.target.value)} className="w-full h-9 px-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
          {tahunList.map(t => <option key={t.id} value={t.id}>{t.nama}{t.is_active ? ' (Aktif)' : ''}</option>)}
        </select>
      </div>

      <div className="px-4 py-4 space-y-4">
        {isLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-neutral-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-5 bg-neutral-200 rounded w-48" />
                    <div className="flex gap-2">
                      <div className="h-6 bg-neutral-200 rounded-full w-20" />
                      <div className="h-6 bg-neutral-200 rounded-full w-16" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="w-8 h-8 bg-neutral-200 rounded-lg" />
                    <div className="w-8 h-8 bg-neutral-200 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2 pl-11">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-2">
                      <div className="w-5 h-5 bg-neutral-200 rounded" />
                      <div className="h-4 bg-neutral-200 rounded w-40" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : groupedItems.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-600">Belum ada item mutabaah</p>
            <p className="text-xs text-neutral-400 mt-1">Tambah item untuk memulai tracking ibadah</p>
            <button onClick={openMainForm} className="mt-4 h-10 px-6 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600">
              + Tambah Item
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              {groupedItems.map((group, index) => {
                const isCollapsed = collapsedIds.has(group.id)
                return (
                  <div key={group.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                    {/* Parent row — clickable to collapse */}
                    <div
                      className="px-4 pt-4 pb-3 bg-gradient-to-r from-primary-50 to-white cursor-pointer select-none"
                      onClick={() => toggleCollapse(group.id)}
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-8 h-8 rounded-lg bg-primary-500 text-white text-sm font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-base text-primary-800">{group.nama_item}</p>
                          <div className="flex items-center gap-2 mt-2 flex-wrap">
                            <span className="text-xs font-medium text-primary-600 bg-primary-100 px-2.5 py-0.5 rounded-full">
                              {group.children.length} Sub Item
                            </span>
                            {group.kelas_list.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                                  {group.kelas_list.length} Kelas
                                </span>
                                {group.kelas_list.map(k => (
                                  <span key={k.kelas_id} className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                                    {k.kelas_nama}
                                    <button
                                      onClick={(e) => { e.stopPropagation(); handleUnassign(group.id, k.kelas_id, k.kelas_nama) }}
                                      className="text-neutral-400 hover:text-danger font-bold leading-none ml-0.5"
                                      title={`Lepas dari ${k.kelas_nama}`}
                                    >
                                      x
                                    </button>
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                                Belum digunakan
                              </span>
                            )}
                          </div>
                        </div>
                        <svg
                          width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="#9ca3af" strokeWidth="2" strokeLinecap="round"
                          className={cn('flex-shrink-0 transition-transform mt-1', isCollapsed ? '-rotate-90' : '')}
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </div>
                    </div>

                    {/* Sub Items — collapsible */}
                    {!isCollapsed && (
                      <>
                        {group.children.length > 0 ? (
                          <div className="border-b border-neutral-100">
                            <p className="px-4 pt-3 pb-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
                              Sub Item
                            </p>
                            {group.children.map((child) => (
                              <div key={child.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-50 last:border-0">
                                <div className="w-5 h-5 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#27AE60" strokeWidth="3" strokeLinecap="round"><path d="M9 11l3 3L22 4"/></svg>
                                </div>
                                <p className="flex-1 text-sm text-neutral-700">{child.nama_item}</p>
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openMoveModal(child) }}
                                    className="text-xs text-neutral-400 hover:text-primary-600 font-semibold px-2 py-1 rounded hover:bg-primary-50 transition-colors"
                                  >
                                    Pindahkan
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); openEditForm(child) }}
                                    className="text-xs text-neutral-400 hover:text-blue-600 font-semibold px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setConfirmHapus(child.id) }}
                                    className="text-xs text-neutral-400 hover:text-danger font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                  >
                                    Hapus
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="px-4 py-4 text-center border-b border-neutral-100">
                            <p className="text-xs text-neutral-400">Belum ada sub item.</p>
                          </div>
                        )}

                          {/* Actions row */}
                        <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50/50 flex-wrap">
                          <button
                            onClick={() => openSubForm(group.id, group.nama_item)}
                            className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Tambah Sub Item
                          </button>
                          <button
                            onClick={() => { setAssignItemId(group.id); setSelectedKelas([]); setShowAssignModal(true) }}
                            className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                            Terapkan ke Kelas
                          </button>
                          {group.kelas_list.length > 0 && (
                            <button
                              onClick={() => setConfirmUnassignItem(group)}
                              className="h-8 px-3 bg-red-100 hover:bg-red-200 text-danger text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                            >
                              Lepas Semua
                            </button>
                          )}
                          <button
                            onClick={() => openEditForm(group)}
                            className="h-8 px-3 border border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => openMoveModal(group)}
                            className="h-8 px-3 border border-neutral-200 bg-white hover:bg-primary-50 hover:border-primary-200 text-primary-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            Pindahkan
                          </button>
                          <button
                            onClick={() => setConfirmDel(group.id)}
                            className="h-8 px-3 border border-neutral-200 bg-white hover:border-amber-200 hover:bg-amber-50 text-amber-600 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            Arsipkan
                          </button>
                          <button
                            onClick={() => setConfirmHapus(group.id)}
                            className="h-8 px-3 border border-neutral-200 bg-white hover:border-red-200 hover:bg-red-50 text-danger text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            Hapus
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )
              })}
            </div>

            {/* ─── Class Cards Section ─── */}
            {kelasList.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wide">Kelas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {kelasList.map(k => {
                    const assignedItems = items.filter(i => i.kelas_list.some(kl => kl.kelas_id === k.id))
                    const totalSiswa = k.jumlah_siswa ?? 0
                    const isExpanded = expandedKelas === k.id
                    return (
                      <div key={k.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
                        <button
                          onClick={() => setExpandedKelas(isExpanded ? null : k.id)}
                          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
                        >
                          <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D7A4F" strokeWidth="2" strokeLinecap="round">
                              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                            </svg>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-neutral-800">{k.nama_kelas}</p>
                            <p className="text-xs text-neutral-500">{totalSiswa} siswa · {assignedItems.length} item</p>
                          </div>
                          <svg
                            width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                            className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-neutral-100 px-4 py-3 space-y-1.5">
                            {assignedItems.length === 0 ? (
                              <p className="text-xs text-neutral-400">Belum ada item untuk kelas ini</p>
                            ) : (
                              assignedItems.map(item => (
                                <div key={item.id} className="flex items-center gap-2 py-1 group">
                                  <span className="w-1.5 h-1.5 rounded-full bg-primary-400 flex-shrink-0" />
                                  <span className="text-xs text-neutral-600 flex-1">{item.nama_item}</span>
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUnassign(item.id, k.id, k.nama_kelas) }}
                                    className="text-[10px] text-danger hover:bg-red-50 px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    title={`Lepas ${item.nama_item} dari ${k.nama_kelas}`}
                                  >
                                    Hapus
                                  </button>
                                </div>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Inactive items */}
            {inactiveItems.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-neutral-400 mb-2 uppercase tracking-wide">Nonaktif ({inactiveItems.length})</p>
                <div className="space-y-1">
                  {inactiveItems.map(item => (
                    <div key={item.id} className="bg-white rounded-lg border border-neutral-200 px-4 py-2.5 flex items-center gap-3">
                      <p className="flex-1 text-sm text-neutral-500 line-through">{item.nama_item}</p>
                      <button
                        onClick={() => setConfirmHapus(item.id)}
                        className="text-xs text-danger font-semibold px-2 py-1 rounded hover:bg-red-50 transition-colors"
                      >
                        Hapus
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ─── MODAL TAMBAH / EDIT ITEM UTAMA ─── */}
      {showMainForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-neutral-800">{editItem ? 'Edit Item' : 'Tambah Item Mutabaah'}</h3>
              <button onClick={() => setShowMainForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <form onSubmit={handleSubmitMain} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Item <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                  placeholder="Contoh: Sholat Fardhu, Adab Harian..."
                  className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Tipe Item</label>
                <select value={formTipe} onChange={e => setFormTipe(e.target.value)} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="checkbox">Centang (Checkbox)</option>
                  <option value="text">Input Teks (Orang tua isi surat & ayat)</option>
                </select>
                <p className="text-[11px] text-neutral-400 mt-1">Tipe "Input Teks" hanya untuk sub item</p>
              </div>

              {/* Sub items opsional — hanya untuk item baru */}
              {!editItem && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-2">Sub Item (opsional)</label>
                  <div className="space-y-2">
                    {subItems.map((sub, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <span className="w-5 h-5 rounded bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="text-primary-400"><path d="M9 11l3 3L22 4"/></svg>
                        </span>
                        <input
                          type="text"
                          value={sub}
                          onChange={e => {
                            const next = [...subItems]
                            next[idx] = e.target.value
                            setSubItems(next)
                          }}
                          placeholder={`Sub item ${idx + 1}`}
                          className="flex-1 h-9 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                        />
                        <button
                          type="button"
                          onClick={() => setSubItems(subItems.filter((_, i) => i !== idx))}
                          className="w-7 h-7 flex items-center justify-center rounded text-neutral-300 hover:text-danger hover:bg-red-50 flex-shrink-0"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                        </button>
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSubItems([...subItems, ''])}
                    className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary-500 hover:text-primary-600"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                    Tambah Sub Item
                  </button>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowMainForm(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button type="submit" disabled={formLoad} className={cn('flex-1 h-11 rounded-lg text-sm font-semibold text-white', formLoad ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
                  {formLoad ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL TAMBAH SUB ITEM ─── */}
      {showSubForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">Tambah Sub Item</h3>
              <button onClick={() => setShowSubForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <form onSubmit={handleSubmitSub} className="p-4 space-y-4">
              <div className="bg-primary-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-neutral-500">Untuk:</p>
                <p className="text-sm font-semibold text-primary-700">{subParentNama}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Sub Item <span className="text-danger">*</span></label>
                <input
                  type="text"
                  value={formNama}
                  onChange={e => setFormNama(e.target.value)}
                  placeholder="Masukkan nama sub item"
                  className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                  required
                />
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Sub item akan muncul sebagai checklist yang diisi orang tua.
                </p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Tipe Item</label>
                <select value={formSubTipe} onChange={e => setFormSubTipe(e.target.value)} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="checkbox">Centang (Checkbox)</option>
                  <option value="text">Input Teks (Surat &amp; Ayat)</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowSubForm(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button type="submit" disabled={formLoad} className={cn('flex-1 h-11 rounded-lg text-sm font-semibold text-white', formLoad ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
                  {formLoad ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODAL PINDAHKAN ─── */}
      {showMoveModal && moveItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">Pindahkan Item</h3>
              <button onClick={() => setShowMoveModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <div className="bg-primary-50 rounded-lg px-3 py-2.5">
                <p className="text-xs text-neutral-500">Memindahkan:</p>
                <p className="text-sm font-semibold text-primary-700">{moveItem.nama_item}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Pindahkan ke</label>
                <select
                  value={moveTargetParent}
                  onChange={e => setMoveTargetParent(e.target.value)}
                  className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="">── Item Induk (Level Utama) ──</option>
                  {parentItems.filter(p => p.id !== moveItem.id).map(p => (
                    <option key={p.id} value={p.id}>{p.nama_item}</option>
                  ))}
                </select>
                <p className="text-[11px] text-neutral-400 mt-1.5">
                  Pilih item induk atau kosongkan untuk menjadikan item induk.
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowMoveModal(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button onClick={handleSubmitMove} disabled={formLoad} className={cn('flex-1 h-11 rounded-lg text-sm font-semibold text-white', formLoad ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
                  {formLoad ? 'Memindahkan...' : 'Pindahkan'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL TERAPKAN KE KELAS ─── */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-neutral-800">Terapkan Item ke Kelas</h3>
              <button onClick={() => setShowAssignModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-neutral-600">Pilih kelas untuk menerapkan item ini:</p>
              <button
                onClick={() => {
                  const unassigned = kelasList.filter(k => !items.find(i => i.id === assignItemId)?.kelas_list.some(kl => kl.kelas_id === k.id))
                  setSelectedKelas(selectedKelas.length === unassigned.length ? [] : unassigned.map(k => k.id))
                }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                {selectedKelas.length === kelasList.filter(k => !items.find(i => i.id === assignItemId)?.kelas_list.some(kl => kl.kelas_id === k.id)).length ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
              {kelasList
                .filter(k => !items.find(i => i.id === assignItemId)?.kelas_list.some(kl => kl.kelas_id === k.id))
                .map(k => {
                  const checked = selectedKelas.includes(k.id)
                  return (
                    <label key={k.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-50 cursor-pointer border border-neutral-100">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => {
                          setSelectedKelas(prev =>
                            checked ? prev.filter(id => id !== k.id) : [...prev, k.id]
                          )
                        }}
                        className="w-4 h-4 rounded border-neutral-300 text-primary-500 focus:ring-primary-300"
                      />
                      <span className="text-sm font-medium text-neutral-700">{k.nama_kelas}</span>
                    </label>
                  )
                })}
              {kelasList.filter(k => !items.find(i => i.id === assignItemId)?.kelas_list.some(kl => kl.kelas_id === k.id)).length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">Semua kelas sudah menerapkan item ini.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button
                  onClick={async () => {
                    if (selectedKelas.length === 0) return
                    setAssignLoad(true)
                    const res = await fetch('/api/admin/mutabaah-items', {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ assignItemId, kelasIds: selectedKelas }),
                    })
                    if (res.ok) {
                      showToast('Item diterapkan ke kelas', 'success')
                      setShowAssignModal(false)
                      queryClient.invalidateQueries({ queryKey: ['mutabaah-items'], exact: false })
                    } else {
                      const d = await res.json()
                      showToast(d.error ?? 'Gagal', 'error')
                    }
                    setAssignLoad(false)
                  }}
                  disabled={assignLoad || selectedKelas.length === 0}
                  className={`flex-1 h-11 rounded-lg text-sm font-semibold text-white ${assignLoad || selectedKelas.length === 0 ? 'bg-neutral-300' : 'bg-green-600 hover:bg-green-700'}`}
                >
                  {assignLoad ? 'Menyimpan...' : `Terapkan ke ${selectedKelas.length} Kelas`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Lepas Semua Kelas Modal */}
      {confirmUnassignItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"><path d="M21 4H3l1 16h16L21 4z"/><line x1="10" y1="11" x2="14" y2="11"/></svg>
            </div>
            <h3 className="font-bold text-neutral-800 text-center mb-2">Lepas Semua Kelas?</h3>
            <p className="text-sm text-neutral-500 text-center mb-4">
              Item <strong>{confirmUnassignItem.nama_item}</strong> akan dilepas dari {confirmUnassignItem.kelas_list.length} kelas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUnassignItem(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={() => handleUnassignAll(confirmUnassignItem)} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-red-700">Lepas Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Archive Modal */}
      {confirmDel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <div className="w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F39C12" strokeWidth="2" strokeLinecap="round"><path d="M21 4H3l1 16h16L21 4z"/><line x1="10" y1="11" x2="14" y2="11"/></svg>
            </div>
            <h3 className="font-bold text-neutral-800 text-center mb-2">Arsipkan Item?</h3>
            <p className="text-sm text-neutral-500 text-center mb-4">Item akan dinonaktifkan tetapi data histori tetap tersimpan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDel(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={() => handleDelete(confirmDel)} className="flex-1 h-11 bg-amber-500 text-white rounded-lg text-sm font-semibold hover:bg-amber-600">Arsipkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Hapus Permanent Modal */}
      {confirmHapus && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
            </div>
            <h3 className="font-bold text-neutral-800 text-center mb-2">Hapus Item?</h3>
            <p className="text-sm text-neutral-500 text-center mb-4">
              Item akan dihapus permanen beserta seluruh data histori mutabaah terkait. Tindakan ini tidak dapat dibatalkan.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmHapus(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={() => handleHapus(confirmHapus)} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-red-700">Hapus</button>
            </div>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  )
}
