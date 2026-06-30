'use client'

import { useState, useEffect } from 'react'
import { useToast }            from '@/components/ui/Toast'
import { Breadcrumb }          from '@/components/ui/Breadcrumb'
import { cn }                  from '@/lib/utils/cn'

interface KelasItem {
  id: string
  nama_kelas: string
  tahun_ajaran_id: string
  wali_kelas_id: string | null
}

interface GuruItem {
  id: string
  nama: string
}

interface TahunAjaranItem { id: string; nama: string }

interface KelasAssignment {
  kelasId:      string
  waliKelasId:  string
  guruWafaId:   string
  guruTahfizId: string
}

export default function AssignGuruPage() {
  const [kelas,     setKelas]     = useState<KelasItem[]>([])
  const [guru,      setGuru]      = useState<GuruItem[]>([])
  const [tahunAjaran, setTahunAjaran] = useState<TahunAjaranItem[]>([])
  const [assign, setAssign] = useState<Record<string, KelasAssignment>>({})
  const [loading,   setLoading]   = useState(true)
  const [saving,    setSaving]    = useState(false)
  const { showToast, ToastComponent } = useToast()

  async function fetchData() {
    setLoading(true)
    const res = await fetch('/api/admin/assign-guru')
    const data = await res.json()
    setKelas(data.kelas ?? [])
    setGuru(data.guru ?? [])
    setTahunAjaran(data.tahunAjaran ?? [])
    const init: Record<string, KelasAssignment> = {}
    for (const k of (data.kelas ?? [])) {
      init[k.id] = { kelasId: k.id, waliKelasId: k.wali_kelas_id ?? '', guruWafaId: k.guru_wafa_id ?? '', guruTahfizId: k.guru_tahfiz_id ?? '' }
    }
    setAssign(init)
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  function update(kelasId: string, field: keyof KelasAssignment, value: string) {
    setAssign(prev => ({
      ...prev,
      [kelasId]: { ...prev[kelasId], [field]: value },
    }))
  }

  async function handleSave() {
    setSaving(true)
    const assignments = Object.values(assign).filter(a => a.waliKelasId || a.guruWafaId || a.guruTahfizId)
    if (assignments.length === 0) {
      showToast('Tidak ada perubahan', 'info')
      setSaving(false)
      return
    }

    const res = await fetch('/api/admin/assign-guru', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ assignments }),
    })

    if (res.ok) {
      const data = await res.json()
      if (data.kelas) setKelas(data.kelas)
      showToast('Penugasan guru berhasil disimpan', 'success')
      const init: Record<string, KelasAssignment> = {}
      for (const k of (data.kelas ?? [])) {
        init[k.id] = { kelasId: k.id, waliKelasId: k.wali_kelas_id ?? '', guruWafaId: k.guru_wafa_id ?? '', guruTahfizId: k.guru_tahfiz_id ?? '' }
      }
      setAssign(init)
    } else {
      showToast('Gagal menyimpan', 'error')
    }
    setSaving(false)
  }

  if (loading) return <div className="p-6 text-sm text-neutral-400">Memuat...</div>

  const hasChanges = Object.values(assign).some(a => a.waliKelasId || a.guruWafaId || a.guruTahfizId)

  // Summary stats
  const totalKelas = kelas.length
  const totalWali  = Object.values(assign).filter(a => a.waliKelasId).length
  const totalWafa  = Object.values(assign).filter(a => a.guruWafaId).length
  const totalTahfiz = Object.values(assign).filter(a => a.guruTahfizId).length
  const isLengkap  = totalWali === totalKelas && totalWafa === totalKelas && totalTahfiz === totalKelas

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <Breadcrumb />
      <h1 className="text-xl font-bold text-neutral-800 mb-1">Penugasan Guru</h1>
      <p className="text-xs text-neutral-400 mb-4">Tentukan guru yang bertanggung jawab untuk tiap kelas</p>

      {/* Summary */}
      <div className="bg-white rounded-xl shadow-card border border-neutral-100 p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-neutral-700">Ringkasan Penugasan</p>
          <span className={cn('text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1.5', isLengkap ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
            {isLengkap ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>
            )}
            {isLengkap ? 'Lengkap' : 'Belum Lengkap'}
          </span>
        </div>
        <div className="grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-bold text-neutral-800">{totalKelas}</p>
            <p className="text-[11px] text-neutral-400">Total Kelas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-blue-600">{totalWali}</p>
            <p className="text-[11px] text-neutral-400">Wali Kelas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-amber-600">{totalWafa}</p>
            <p className="text-[11px] text-neutral-400">Guru Wafa</p>
          </div>
          <div>
            <p className="text-lg font-bold text-emerald-600">{totalTahfiz}</p>
            <p className="text-[11px] text-neutral-400">Guru Tahfiz</p>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {kelas.map(k => {
          const a = assign[k.id]
          if (!a) return null
          const ta = tahunAjaran.find(t => t.id === k.tahun_ajaran_id)

          return (
            <div key={k.id} className="bg-white rounded-xl shadow-card border border-neutral-100 p-5 space-y-4">
              {/* Header kelas */}
              <div className="flex items-center gap-3 border-b border-neutral-100 pb-3">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D7A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
                    <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
                  </svg>
                </div>
                <div>
                  <p className="font-bold text-neutral-800">Kelas {k.nama_kelas}</p>
                  <p className="text-[11px] text-neutral-400">{ta?.nama ?? '-'}</p>
                </div>
              </div>

              {/* Penugasan */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Wali Kelas */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    Wali Kelas
                  </label>
                  <select
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 focus:outline-none transition-colors"
                    value={a.waliKelasId}
                    onChange={e => update(k.id, 'waliKelasId', e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    {guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </div>

                {/* Guru Wafa */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-amber-600 mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                    </svg>
                    Guru Wafa
                  </label>
                  <select
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:border-amber-400 focus:ring-1 focus:ring-amber-400 focus:outline-none transition-colors"
                    value={a.guruWafaId}
                    onChange={e => update(k.id, 'guruWafaId', e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    {guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </div>

                {/* Guru Tahfiz */}
                <div>
                  <label className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 mb-1.5">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                    </svg>
                    Guru Tahfizh
                  </label>
                  <select
                    className="w-full rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 text-sm text-neutral-700 focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400 focus:outline-none transition-colors"
                    value={a.guruTahfizId}
                    onChange={e => update(k.id, 'guruTahfizId', e.target.value)}
                  >
                    <option value="">-- Pilih --</option>
                    {guru.map(g => <option key={g.id} value={g.id}>{g.nama}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {kelas.length === 0 && (
        <div className="bg-white rounded-xl shadow-card border border-neutral-100 text-center py-12">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <p className="text-neutral-500 text-sm">Belum ada kelas</p>
          <p className="text-neutral-400 text-xs mt-1">Buat kelas terlebih dahulu di menu Kelas</p>
        </div>
      )}

      {/* Simpan */}
      {hasChanges && (
        <div className="mt-6 bg-white rounded-xl shadow-card border border-primary-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary-50 flex items-center justify-center flex-shrink-0">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#2D7A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-neutral-700">Ada perubahan yang belum disimpan</p>
              <p className="text-[11px] text-neutral-400">Klik tombol di sebelah untuk menyimpan penugasan guru</p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 h-10 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-lg transition-all disabled:opacity-50 flex-shrink-0"
            >
              {saving ? 'Menyimpan...' : 'Simpan'}
            </button>
          </div>
        </div>
      )}

      {ToastComponent}
    </div>
  )
}
