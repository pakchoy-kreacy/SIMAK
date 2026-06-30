'use client'

import { useState, useMemo } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast } from '@/components/ui/Toast'
import { cn } from '@/lib/utils/cn'

interface ItemData {
  id: string
  nama_item: string
  parent_id: string | null
  urutan: number
  tipe: string
}

interface KelasData {
  id: string
  nama_kelas: string
  jumlah_siswa: number
}

interface Assignment {
  mutabaah_item_id: string
  kelas_id: string
}

interface PageData {
  items: ItemData[]
  kelasList: KelasData[]
  assignments: Assignment[]
}

export function AturMutabaahClient() {
  const queryClient = useQueryClient()
  const { showToast, ToastComponent } = useToast()

  const { data, isLoading } = useQuery<PageData>({
    queryKey: ['atur-mutabaah-guru'],
    queryFn: async () => {
      const r = await fetch('/api/staff/atur-mutabaah')
      if (!r.ok) throw new Error('Gagal memuat data')
      return r.json()
    },
    staleTime: 30000,
  })

  const items = data?.items ?? []
  const kelasList = data?.kelasList ?? []
  const assignments = data?.assignments ?? []

  const assignmentSet = useMemo(() => {
    const set = new Set<string>()
    for (const a of assignments) {
      set.add(`${a.mutabaah_item_id}:${a.kelas_id}`)
    }
    return set
  }, [assignments])

  const groupedItems = useMemo(() => {
    const parents = items.filter(i => !i.parent_id)
    const children = items.filter(i => i.parent_id)
    return parents.map(p => ({
      ...p,
      children: children.filter(c => c.parent_id === p.id),
      assignedKelas: kelasList.filter(k => assignmentSet.has(`${p.id}:${k.id}`)),
    }))
  }, [items, kelasList, assignmentSet])

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set())
  const [expandedKelas, setExpandedKelas] = useState<string | null>(null)

  // Modal assign
  const [showAssignModal, setShowAssignModal] = useState(false)
  const [assignItemId, setAssignItemId] = useState('')
  const [assignItemNama, setAssignItemNama] = useState('')
  const [selectedKelas, setSelectedKelas] = useState<string[]>([])
  const [assignLoad, setAssignLoad] = useState(false)

  // Confirm unassign all
  const [confirmUnassignItem, setConfirmUnassignItem] = useState<{ id: string; nama_item: string; count: number } | null>(null)

  function toggleCollapse(id: string) {
    setCollapsedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function openAssign(item: ItemData & { assignedKelas: KelasData[] }) {
    setAssignItemId(item.id)
    setAssignItemNama(item.nama_item)
    setSelectedKelas([])
    setShowAssignModal(true)
  }

  async function handleAssignAll(itemId: string) {
    setAssignLoad(true)
    const res = await fetch('/api/staff/atur-mutabaah', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, kelasIds: kelasList.map(k => k.id) }),
    })
    if (res.ok) {
      showToast('Item diterapkan ke semua kelas', 'success')
      queryClient.invalidateQueries({ queryKey: ['atur-mutabaah-guru'] })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
    setAssignLoad(false)
  }

  async function handleAssignSelected() {
    if (selectedKelas.length === 0) return
    setAssignLoad(true)
    const res = await fetch('/api/staff/atur-mutabaah', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: assignItemId, kelasIds: selectedKelas }),
    })
    if (res.ok) {
      showToast(`Item diterapkan ke ${selectedKelas.length} kelas`, 'success')
      setShowAssignModal(false)
      queryClient.invalidateQueries({ queryKey: ['atur-mutabaah-guru'] })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
    setAssignLoad(false)
  }

  async function handleUnassignAll(itemId: string, nama: string, count: number) {
    if (count === 0) return
    setConfirmUnassignItem({ id: itemId, nama_item: nama, count })
  }

  async function confirmUnassignAll() {
    if (!confirmUnassignItem) return
    const res = await fetch('/api/staff/atur-mutabaah', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId: confirmUnassignItem.id }),
    })
    if (res.ok) {
      showToast(`Item dilepas dari semua kelas`, 'success')
      setConfirmUnassignItem(null)
      queryClient.invalidateQueries({ queryKey: ['atur-mutabaah-guru'] })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
  }

  async function handleUnassign(itemId: string, kelasId: string, kelasNama: string) {
    const res = await fetch('/api/staff/atur-mutabaah', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ itemId, kelasId }),
    })
    if (res.ok) {
      showToast(`Lepas dari ${kelasNama} berhasil`, 'success')
      queryClient.invalidateQueries({ queryKey: ['atur-mutabaah-guru'] })
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal', 'error')
    }
  }

  if (isLoading) {
    return (
      <div className="p-4 max-w-3xl mx-auto space-y-4">
        <div className="h-8 bg-neutral-200 rounded w-48 animate-pulse" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white rounded-xl border border-neutral-200 p-4 animate-pulse">
            <div className="h-5 bg-neutral-200 rounded w-48 mb-3" />
            <div className="flex gap-2 flex-wrap">
              <div className="h-6 bg-neutral-200 rounded-full w-20" />
              <div className="h-6 bg-neutral-200 rounded-full w-16" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <div className="mb-4">
        <h1 className="text-lg font-bold text-neutral-800">Atur Item Mutabaah</h1>
        <p className="text-xs text-neutral-400">Pilih item dan kelas yang akan diterapkan</p>
      </div>

      {kelasList.length === 0 && (
        <div className="bg-white rounded-xl border border-neutral-200 text-center py-12">
          <p className="text-sm font-semibold text-neutral-600">Belum ada kelas yang ditugaskan</p>
          <p className="text-xs text-neutral-400 mt-1">Hubungi admin untuk penugasan kelas</p>
        </div>
      )}

      {kelasList.length > 0 && (
        <>
          {/* Items List */}
          <div className="space-y-3 mb-6">
            {groupedItems.map((group, index) => {
              const isCollapsed = collapsedIds.has(group.id)
              return (
                <div key={group.id} className="bg-white rounded-xl border border-neutral-200 overflow-hidden">
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
                          {group.assignedKelas.length > 0 ? (
                            <div className="flex items-center gap-1 flex-wrap">
                              <span className="text-xs font-medium text-green-700 bg-green-100 px-2.5 py-0.5 rounded-full">
                                {group.assignedKelas.length} Kelas
                              </span>
                              {group.assignedKelas.map(k => (
                                <span key={k.id} className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-600 bg-neutral-100 px-2 py-0.5 rounded-full">
                                  {k.nama_kelas}
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleUnassign(group.id, k.id, k.nama_kelas) }}
                                    className="text-neutral-400 hover:text-danger font-bold leading-none ml-0.5"
                                    title={`Lepas dari ${k.nama_kelas}`}
                                  >
                                    x
                                  </button>
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-xs font-medium text-neutral-400 bg-neutral-100 px-2.5 py-0.5 rounded-full">
                              Belum diterapkan
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

                  {!isCollapsed && (
                    <>
                      {group.children.length > 0 && (
                        <div className="border-b border-neutral-100 px-4 py-3">
                          <p className="text-[11px] font-semibold text-neutral-400 uppercase tracking-wider mb-2">Sub Item</p>
                          <div className="space-y-2">
                            {group.children.map(child => (
                              <div key={child.id} className="flex items-center gap-3 text-sm text-neutral-700">
                                <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
                                {child.nama_item}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2 px-4 py-3 bg-neutral-50/50 flex-wrap">
                        <button
                          onClick={() => openAssign(group)}
                          className="h-8 px-3 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                        >
                          Terapkan ke Kelas
                        </button>
                        <button
                          onClick={() => handleAssignAll(group.id)}
                          disabled={assignLoad}
                          className="h-8 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        >
                          Terapkan ke Semua
                        </button>
                        {group.assignedKelas.length > 0 && (
                          <button
                            onClick={() => handleUnassignAll(group.id, group.nama_item, group.assignedKelas.length)}
                            className="h-8 px-3 bg-red-100 hover:bg-red-200 text-danger text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                          >
                            Lepas Semua
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>

          {/* Class Cards */}
          <div>
            <p className="text-xs font-semibold text-neutral-500 mb-3 uppercase tracking-wide">Kelas</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kelasList.map(k => {
                const assignedItems = items.filter(i => assignmentSet.has(`${i.id}:${k.id}`))
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
                        <p className="text-xs text-neutral-500">{k.jumlah_siswa} siswa · {assignedItems.length} item</p>
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
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white z-10">
              <h3 className="font-bold text-neutral-800">Terapkan ke Kelas</h3>
              <button onClick={() => setShowAssignModal(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <div className="p-4 space-y-4">
              <p className="text-sm text-neutral-600">{assignItemNama}</p>
              <button
                onClick={() => {
                  const unassigned = kelasList.filter(k => !assignmentSet.has(`${assignItemId}:${k.id}`))
                  setSelectedKelas(selectedKelas.length === unassigned.length ? [] : unassigned.map(k => k.id))
                }}
                className="text-xs font-semibold text-primary-600 hover:text-primary-700 transition-colors"
              >
                {selectedKelas.length === kelasList.filter(k => !assignmentSet.has(`${assignItemId}:${k.id}`)).length ? 'Hapus Semua' : 'Pilih Semua'}
              </button>
              {kelasList
                .filter(k => !assignmentSet.has(`${assignItemId}:${k.id}`))
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
              {kelasList.filter(k => !assignmentSet.has(`${assignItemId}:${k.id}`)).length === 0 && (
                <p className="text-sm text-neutral-400 text-center py-4">Semua kelas sudah menerapkan item ini.</p>
              )}
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAssignModal(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button
                  onClick={handleAssignSelected}
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

      {/* Confirm Unassign All Modal */}
      {confirmUnassignItem && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#E74C3C" strokeWidth="2" strokeLinecap="round"><path d="M21 4H3l1 16h16L21 4z"/><line x1="10" y1="11" x2="14" y2="11"/></svg>
            </div>
            <h3 className="font-bold text-neutral-800 text-center mb-2">Lepas Semua Kelas?</h3>
            <p className="text-sm text-neutral-500 text-center mb-4">
              Item <strong>{confirmUnassignItem.nama_item}</strong> akan dilepas dari {confirmUnassignItem.count} kelas.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmUnassignItem(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={confirmUnassignAll} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold hover:bg-red-700">Lepas Semua</button>
            </div>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
