'use client'

import { useState, useEffect, useMemo, useRef }  from 'react'
import { useSearchParams }      from 'next/navigation'
import { useToast }             from '@/components/ui/Toast'
import { ImportExcelModal }     from '@/components/admin/ImportExcelModal'
import { SiswaFormModal }       from '@/components/admin/SiswaFormModal'
import { Breadcrumb }           from '@/components/ui/Breadcrumb'
import { cn }                   from '@/lib/utils/cn'

interface SiswaRow {
  id:           string
  nisn:         string
  nama_lengkap: string
  parent_name:  string | null
  parent_phone: string | null
  kelas:        string | null
  kelas_id:     string | null
  is_active:    boolean
  wali_kelas:   string | null
}

interface KelasGroup {
  nama:    string
  kelasId: string | null
  siswa:   SiswaRow[]
  waliKelas: string | null
}

export default function AdminSiswaPage() {
  const searchParams = useSearchParams()
  const [siswaList,   setSiswaList]   = useState<SiswaRow[]>([])
  const [isLoading,   setIsLoading]   = useState(true)
  const [search,      setSearch]      = useState('')
  const [showImport,  setShowImport]  = useState(searchParams.get('import') === '1')
  const [editSiswa,   setEditSiswa]   = useState<SiswaRow | null>(null)
  const [showAdd,     setShowAdd]     = useState(false)
  const [confirmDeact, setConfirmDeact] = useState<string | null>(null)
  const [confirmDeleteAll, setConfirmDeleteAll] = useState(false)
  const [confirmDeleteKelas, setConfirmDeleteKelas] = useState<{ nama: string; id: string | null } | null>(null)
  const [expandedKelas, setExpandedKelas] = useState<Set<string>>(new Set())
  const { showToast, ToastComponent } = useToast()
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  function handleSearchChange(value: string) {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setSearch(value)
    }, 300)
  }

  async function fetchSiswa() {
    setIsLoading(true)
    const res = await fetch('/api/admin/siswa')
    const data = await res.json()
    setSiswaList(Array.isArray(data) ? data : [])
    setIsLoading(false)
  }

  useEffect(() => { fetchSiswa() }, [])

  const kelasGroups = useMemo(() => {
    const filtered = search
      ? siswaList.filter(s =>
          s.nama_lengkap.toLowerCase().includes(search.toLowerCase()) ||
          s.nisn.includes(search)
        )
      : siswaList

    const map = new Map<string, SiswaRow[]>()
    for (const s of filtered) {
      const k = s.kelas || 'Tanpa Kelas'
      if (!map.has(k)) map.set(k, [])
      map.get(k)!.push(s)
    }

    const groups: KelasGroup[] = []
    for (const [nama, siswa] of map) {
      const kelasId = siswa.find(s => s.kelas_id)?.kelas_id ?? null
      groups.push({ nama, kelasId, siswa, waliKelas: siswa.find(s => s.wali_kelas)?.wali_kelas ?? null })
    }
    groups.sort((a, b) => a.nama.localeCompare(b.nama, undefined, { numeric: true }))
    return groups
  }, [siswaList, search])

  const totalActive = siswaList.filter(s => s.is_active).length
  const totalKelas  = new Set(siswaList.map(s => s.kelas).filter(Boolean)).size

  function toggleKelas(nama: string) {
    setExpandedKelas(prev => {
      const next = new Set(prev)
      if (next.has(nama)) next.delete(nama)
      else next.add(nama)
      return next
    })
  }

  async function handleDeactivate(id: string) {
    const res = await fetch(`/api/admin/siswa/${id}`, { method: 'DELETE' })
    if (res.ok) {
      showToast('Siswa dinonaktifkan', 'success')
      setConfirmDeact(null)
      fetchSiswa()
    } else {
      showToast('Gagal menonaktifkan', 'error')
    }
  }

  async function handleDeleteAll() {
    const res = await fetch('/api/admin/siswa/delete-all', { method: 'POST' })
    if (res.ok) {
      showToast('Semua siswa berhasil dihapus', 'success')
      setConfirmDeleteAll(false)
      fetchSiswa()
    } else {
      showToast('Gagal menghapus data', 'error')
    }
  }

  async function handleDeleteByKelas(kelasId: string | null, namaKelas: string) {
    if (!kelasId) return
    const res = await fetch('/api/admin/siswa/delete-by-kelas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kelasId }),
    })
    if (res.ok) {
      showToast(`Semua siswa kelas ${namaKelas} dihapus`, 'success')
      setConfirmDeleteKelas(null)
      fetchSiswa()
    } else {
      showToast('Gagal menghapus', 'error')
    }
  }

  const CLASS_COLORS: Record<string, string> = {
    '1': 'bg-blue-500', '2': 'bg-green-500', '3': 'bg-emerald-500',
    '4': 'bg-amber-500', '5': 'bg-orange-500', '6': 'bg-teal-500',
  }

  function getClassColor(nama: string) {
    const grade = nama.charAt(0)
    return CLASS_COLORS[grade] || 'bg-neutral-500'
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      {/* Header */}
      <div className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-14 md:top-0 z-30">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-neutral-800">Kelola Siswa</h2>
          <div className="flex gap-2">
            <button
              onClick={() => setShowImport(true)}
              className="h-9 px-3 bg-teal-500 hover:bg-teal-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              📥 Import
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              + Tambah
            </button>
          </div>
        </div>
        <input
          type="text"
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder="Cari nama atau NISN..."
          className="w-full h-9 px-3 text-sm border border-neutral-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-300"
        />
      </div>

      {/* Stats bar */}
      <div className="px-4 py-3 flex items-center justify-between bg-white border-b border-neutral-100">
        <div className="flex gap-4">
          <p className="text-xs text-neutral-500"><span className="font-bold text-primary-600">{totalActive}</span> siswa aktif</p>
          <p className="text-xs text-neutral-500"><span className="font-bold text-blue-600">{totalKelas}</span> kelas</p>
        </div>
        {siswaList.some(s => s.is_active) && (
          <button
            onClick={() => setConfirmDeleteAll(true)}
            className="text-xs text-danger font-semibold hover:underline"
          >
            Hapus Semua
          </button>
        )}
      </div>

      {/* Class groups */}
      <div className="px-4 py-4 space-y-3">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card border border-neutral-100 p-4 animate-pulse">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-neutral-200" />
                    <div className="space-y-2">
                      <div className="h-4 bg-neutral-200 rounded w-24" />
                      <div className="h-3 bg-neutral-200 rounded w-32" />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <div className="h-6 bg-neutral-200 rounded w-16" />
                    <div className="w-6 h-6 bg-neutral-200 rounded" />
                  </div>
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="flex items-center gap-3 p-2">
                      <div className="w-8 h-8 rounded-full bg-neutral-200" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-neutral-200 rounded w-40" />
                        <div className="h-3 bg-neutral-200 rounded w-24" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : kelasGroups.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-neutral-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-600">Belum ada siswa</p>
            <p className="text-xs text-neutral-400 mt-1">Tambah siswa atau import dari Excel</p>
            <button
              onClick={() => setShowImport(true)}
              className="mt-4 h-10 px-6 bg-primary-500 text-white text-sm font-semibold rounded-lg hover:bg-primary-600 transition-colors"
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Import Excel
              </span>
            </button>
          </div>
        ) : (
          kelasGroups.map((group) => {
            const isExpanded = expandedKelas.has(group.nama) || !!search
            const activeSiswa = group.siswa.filter(s => s.is_active)
            const inactiveSiswa = group.siswa.filter(s => !s.is_active)

            return (
              <div key={group.nama} className="bg-white rounded-xl border border-neutral-200 overflow-hidden animate-in">
                {/* Class header */}
                <div className="flex items-center gap-3 px-4 py-3">
                  <button
                    onClick={() => toggleKelas(group.nama)}
                    className="flex-1 flex items-center gap-3"
                  >
                    <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm flex-shrink-0', getClassColor(group.nama))}>
                      {group.nama}
                    </div>
                    <div className="flex-1 text-left">
                      <p className="font-bold text-sm text-neutral-800">Kelas {group.nama}</p>
                      <p className="text-xs text-neutral-400">{activeSiswa.length} siswa aktif{group.waliKelas ? ` · ${group.waliKelas}` : ''}</p>
                    </div>
                    <svg
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                      className={cn('text-neutral-400 transition-transform', isExpanded && 'rotate-180')}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {group.kelasId && (
                    <button
                      onClick={() => setConfirmDeleteKelas({ nama: group.nama, id: group.kelasId })}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-300 hover:text-danger hover:bg-red-50 transition-colors flex-shrink-0"
                      title={`Hapus semua siswa kelas ${group.nama}`}
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
                      </svg>
                    </button>
                  )}
                </div>

                {/* Siswa list */}
                {isExpanded && (
                  <div className="border-t border-neutral-100">
                    {activeSiswa.map((siswa) => (
                      <div key={siswa.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-neutral-50 last:border-0">
                        <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
                          <span className="text-primary-700 font-bold text-xs">{siswa.nama_lengkap.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-neutral-800 truncate">{siswa.nama_lengkap}</p>
                          <p className="text-[11px] text-neutral-400">NISN: {siswa.nisn}</p>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setEditSiswa(siswa)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-500 hover:bg-primary-50 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => setConfirmDeact(siswa.id)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger hover:bg-red-50 transition-colors"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                              <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6"/>
                            </svg>
                          </button>
                        </div>
                      </div>
                    ))}
                    {inactiveSiswa.length > 0 && (
                      <div className="px-4 py-2 bg-neutral-50">
                        <p className="text-[11px] text-neutral-400 font-semibold">{inactiveSiswa.length} siswa nonaktif</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Confirm Delete All Modal */}
      {confirmDeleteAll && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <h3 className="font-bold text-neutral-800 mb-2">Hapus Semua Siswa?</h3>
            <p className="text-sm text-neutral-500 mb-4">Semua data siswa akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteAll(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={handleDeleteAll} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold">Hapus Semua</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Deactivate Modal */}
      {confirmDeact && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-4">
            <h3 className="font-bold text-neutral-800 mb-2">Nonaktifkan Siswa?</h3>
            <p className="text-sm text-neutral-500 mb-4">Data historis tetap tersimpan.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeact(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={() => handleDeactivate(confirmDeact)} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold">Nonaktifkan</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete by Kelas Modal */}
      {confirmDeleteKelas && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl p-5">
            <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-danger">
                <path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>
              </svg>
            </div>
            <h3 className="font-bold text-neutral-800 text-center mb-1">Hapus Kelas {confirmDeleteKelas.nama}?</h3>
            <p className="text-sm text-neutral-500 text-center mb-4">Semua siswa di kelas ini akan dihapus permanen.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDeleteKelas(null)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
              <button onClick={() => confirmDeleteKelas.id && handleDeleteByKelas(confirmDeleteKelas.id, confirmDeleteKelas.nama)} className="flex-1 h-11 bg-danger text-white rounded-lg text-sm font-semibold">Hapus</button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      {showImport && (
        <ImportExcelModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); fetchSiswa(); showToast('Import berhasil', 'success') }}
        />
      )}
      {(showAdd || editSiswa) && (
        <SiswaFormModal
          siswa={editSiswa}
          onClose={() => { setShowAdd(false); setEditSiswa(null) }}
          onSuccess={() => { setShowAdd(false); setEditSiswa(null); fetchSiswa(); showToast(editSiswa ? 'Data diperbarui' : 'Siswa ditambahkan', 'success') }}
        />
      )}
      {ToastComponent}
    </div>
  )
}
