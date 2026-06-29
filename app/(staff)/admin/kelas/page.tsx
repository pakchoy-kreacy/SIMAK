// ============================================================
// app/(staff)/admin/kelas/page.tsx
// Kelola Kelas — CRUD kelas per tahun ajaran
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useToast }            from '@/components/ui/Toast'
import { Breadcrumb }          from '@/components/ui/Breadcrumb'
import { cn }                  from '@/lib/utils/cn'

interface KelasItemInfo { item_id: string; item_nama: string }

interface KelasRow {
  id:             string
  nama_kelas:     string
  tahun_ajaran_id: string
  tahun_ajaran:   { nama: string }
  wali_kelas:     { id: string; nama: string } | null
  jumlah_siswa:   number
  mutabaah_hari_ini: number
  tahfiz_hari_ini:   number
  mutabaah_items: KelasItemInfo[]
}

interface TahunItem { id: string; nama: string; is_active: boolean }
interface StaffItem { id: string; nama: string; role: string }

export default function AdminKelasPage() {
  const queryClient = useQueryClient()
  const [selectedTahun, setSelectedTahun] = useState('')
  const [showForm,    setShowForm]    = useState(false)
  const [editKelas,   setEditKelas]   = useState<KelasRow | null>(null)
  const [confirmDel,  setConfirmDel]  = useState<string | null>(null)
  const { showToast, ToastComponent } = useToast()

  // Form state
  const [formNama,    setFormNama]    = useState('')
  const [formTahun,   setFormTahun]   = useState('')
  const [formWali,    setFormWali]    = useState('')
  const [formLoading, setFormLoading] = useState(false)

  const { data: tahunList = [], isLoading: tahunLoading } = useQuery<TahunItem[]>({
    queryKey: ['tahun-ajaran'],
    queryFn: async () => { const r = await fetch('/api/admin/tahun-ajaran'); if (!r.ok) throw new Error('Gagal'); return r.json() },
    staleTime: 60000,
  })

  const { data: rawStaff = [] } = useQuery<StaffItem[]>({
    queryKey: ['staff'],
    queryFn: async () => { const r = await fetch('/api/admin/staff'); if (!r.ok) throw new Error('Gagal'); return r.json() },
    staleTime: 60000,
  })

  const staffList = Array.isArray(rawStaff) ? rawStaff.filter((s: any) => s.is_active) : []

  const { data: kelasList = [], isLoading: kelasLoading } = useQuery<KelasRow[]>({
    queryKey: ['kelas', selectedTahun],
    queryFn: async () => {
      const r = await fetch(`/api/admin/kelas${selectedTahun ? `?tahunId=${selectedTahun}` : ''}`)
      if (!r.ok) throw new Error('Gagal')
      return r.json()
    },
    staleTime: 30000,
    enabled: !!selectedTahun,
  })

  const isLoading = tahunLoading || kelasLoading || !selectedTahun

  // Set initial selected tahun once list loads
  useEffect(() => {
    if (!selectedTahun && tahunList.length > 0) {
      const aktif = tahunList.find((t: any) => t.is_active)
      setSelectedTahun(aktif?.id ?? tahunList[0]?.id ?? '')
      setFormTahun(aktif?.id ?? tahunList[0]?.id ?? '')
    }
  }, [tahunList, selectedTahun])

  function openAddForm() {
    setEditKelas(null)
    setFormNama('')
    setFormWali('')
    setShowForm(true)
  }

  function openEditForm(kelas: KelasRow) {
    setEditKelas(kelas)
    setFormNama(kelas.nama_kelas)
    setFormTahun(kelas.tahun_ajaran_id)
    setFormWali(kelas.wali_kelas?.id ?? '')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!formNama.trim()) return
    setFormLoading(true)

    if (editKelas) {
      const res = await fetch(`/api/admin/kelas/${editKelas.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaKelas: formNama, waliKelasId: formWali || null }),
      })
      if (res.ok) { showToast('Kelas diperbarui', 'success'); setShowForm(false); queryClient.invalidateQueries({ queryKey: ['kelas'] }) }
      else { const d = await res.json(); showToast(d.error ?? 'Gagal', 'error') }
    } else {
      const res = await fetch('/api/admin/kelas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ namaKelas: formNama, tahunAjaranId: formTahun, waliKelasId: formWali || null }),
      })
      if (res.ok) { showToast('Kelas ditambahkan', 'success'); setShowForm(false); queryClient.invalidateQueries({ queryKey: ['kelas'] }) }
      else { const d = await res.json(); showToast(d.error ?? 'Gagal', 'error') }
    }
    setFormLoading(false)
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/admin/kelas/${id}`, { method: 'DELETE' })
    if (res.ok) { showToast('Kelas dihapus', 'success'); setConfirmDel(null); queryClient.invalidateQueries({ queryKey: ['kelas'] }) }
    else { const d = await res.json(); showToast(d.error ?? 'Gagal menghapus', 'error') }
  }

  const waliKelasStaff = staffList.filter(s => ['wali_kelas', 'admin'].includes(s.role))

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-14 md:top-0 z-30">
        <Breadcrumb />
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-neutral-800">Kelola Kelas</h2>
          <button onClick={openAddForm} className="h-9 px-3 bg-primary-500 text-white text-xs font-semibold rounded-lg">+ Tambah</button>
        </div>
        {/* Filter tahun */}
        <select
          value={selectedTahun}
          onChange={e => setSelectedTahun(e.target.value)}
          className="w-full h-9 px-3 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
        >
          {tahunList.map(t => (
            <option key={t.id} value={t.id}>{t.nama}{t.is_active ? ' (Aktif)' : ''}</option>
          ))}
        </select>
      </div>

      <div className="px-4 py-4 space-y-2">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-card border border-neutral-100 p-4 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-neutral-200 flex-shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-neutral-200 rounded w-32" />
                    <div className="h-3 bg-neutral-200 rounded w-48" />
                    <div className="flex gap-3">
                      <div className="h-3 bg-neutral-200 rounded w-24" />
                      <div className="h-3 bg-neutral-200 rounded w-24" />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <div className="w-8 h-8 bg-neutral-200 rounded-full" />
                    <div className="w-8 h-8 bg-neutral-200 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : kelasList.length === 0 ? (
          <div className="bg-white rounded-xl shadow-card border border-neutral-100 text-center py-12">
            <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-neutral-600">Belum ada kelas</p>
            <p className="text-xs text-neutral-400 mt-1">Tambah kelas untuk tahun ajaran ini</p>
          </div>
        ) : (
          kelasList.map((kelas, i) => (
            <div key={kelas.id} className="card animate-in" style={{ animationDelay: `${i * 0.03}s` }}>
              {confirmDel === kelas.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-neutral-700">Hapus Kelas {kelas.nama_kelas}?</p>
                  <div className="flex gap-2">
                    <button onClick={() => setConfirmDel(null)} className="flex-1 py-1.5 text-xs border border-neutral-200 rounded-md font-semibold">Batal</button>
                    <button onClick={() => handleDelete(kelas.id)} className="flex-1 py-1.5 text-xs bg-danger text-white rounded-md font-semibold">Hapus</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-700 font-bold text-sm">{kelas.nama_kelas}</span>
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-neutral-800">Kelas {kelas.nama_kelas}</p>
                    <p className="text-xs text-neutral-400">
                      {kelas.jumlah_siswa} siswa · {kelas.wali_kelas?.nama ?? 'Belum ada wali kelas'}
                    </p>
                    <div className="flex gap-3 mt-1.5">
                      <span className="text-[11px] text-green-600 font-medium">
                        Mutabaah {kelas.mutabaah_hari_ini}/{kelas.jumlah_siswa}
                      </span>
                      <span className="text-[11px] text-emerald-600 font-medium">
                        Tahfizh {kelas.tahfiz_hari_ini}/{kelas.jumlah_siswa}
                      </span>
                    </div>
                    {/* Mutabaah items assigned */}
                    {kelas.mutabaah_items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {kelas.mutabaah_items.map(item => (
                          <span key={item.item_id} className="text-[10px] font-medium text-primary-600 bg-primary-50 px-1.5 py-0.5 rounded">
                            {item.item_nama}
                          </span>
                        ))}
                      </div>
                    )}
                    {kelas.mutabaah_items.length === 0 && kelas.jumlah_siswa > 0 && (
                      <p className="text-[11px] text-amber-500 mt-1.5 font-medium">
                        Belum ada template mutabaah
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => openEditForm(kelas)} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-primary-500 hover:bg-primary-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                    </button>
                    <button onClick={() => setConfirmDel(kelas.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-neutral-400 hover:text-danger hover:bg-red-50">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/></svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100">
              <h3 className="font-bold text-neutral-800">{editKelas ? 'Edit Kelas' : 'Tambah Kelas'}</h3>
              <button onClick={() => setShowForm(false)} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Kelas <span className="text-danger">*</span></label>
                <input type="text" value={formNama} onChange={e => setFormNama(e.target.value)} placeholder="Contoh: 4.1, 4.2, 1.3" className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" required />
              </div>
              {!editKelas && (
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Tahun Ajaran <span className="text-danger">*</span></label>
                  <select value={formTahun} onChange={e => setFormTahun(e.target.value)} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" required>
                    <option value="">-- Pilih --</option>
                    {tahunList.map(t => <option key={t.id} value={t.id}>{t.nama}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Wali Kelas <span className="text-neutral-400 font-normal">(opsional)</span></label>
                <select value={formWali} onChange={e => setFormWali(e.target.value)} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
                  <option value="">-- Belum ditentukan --</option>
                  {waliKelasStaff.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">Batal</button>
                <button type="submit" disabled={formLoading} className={cn('flex-1 h-11 rounded-lg text-sm font-semibold text-white', formLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
                  {formLoading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {ToastComponent}
    </div>
  )
}
