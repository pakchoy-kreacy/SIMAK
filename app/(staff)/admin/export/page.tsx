'use client'

import { useState, useEffect } from 'react'
import { downloadFromUrl }     from '@/lib/utils/excel'
import { useToast }            from '@/components/ui/Toast'
import { Breadcrumb }          from '@/components/ui/Breadcrumb'
import { cn }                  from '@/lib/utils/cn'
import { getTodayWIB, formatTanggal } from '@/lib/utils/date'

const EXPORT_TYPES = [
  { value: 'mutabaah', label: 'Mutabaah', icon: <IconCheck />, desc: 'Data ibadah harian per siswa' },
  { value: 'tahfiz',   label: 'Tahfiz',   icon: <IconBook />, desc: 'Riwayat setoran hafalan' },
  { value: 'wafa',     label: 'Wafa',     icon: <IconStar />, desc: 'Riwayat progres Wafa' },
]

interface TahunItem { id: string; nama: string; is_active: boolean }
interface KelasItem { id: string; nama_kelas: string }

export default function AdminExportPage() {
  const today = getTodayWIB()
  const firstDayOfMonth = today.slice(0, 8) + '01'

  const [type,        setType]        = useState('mutabaah')
  const [tahunId,     setTahunId]     = useState('')
  const [kelasId,     setKelasId]     = useState('')
  const [dateFrom,    setDateFrom]    = useState(firstDayOfMonth)
  const [dateTo,      setDateTo]      = useState(today)
  const [tahunList,   setTahunList]   = useState<TahunItem[]>([])
  const [kelasList,   setKelasList]   = useState<KelasItem[]>([])
  const [isLoading,   setIsLoading]   = useState(false)
  const [preview, setPreview]         = useState<{ siswa: number; kelas: number } | null>(null)
  const { showToast, ToastComponent } = useToast()

  useEffect(() => {
    Promise.all([
      fetch('/api/admin/tahun-ajaran').then(r => r.json()),
    ]).then(([tData]) => {
      setTahunList(Array.isArray(tData) ? tData : [])
      const aktif = tData.find((t: any) => t.is_active)
      if (aktif) setTahunId(aktif.id)
    })
  }, [])

  useEffect(() => {
    if (!tahunId) return
    fetch(`/api/admin/kelas?tahunId=${tahunId}`)
      .then(r => r.json())
      .then(data => setKelasList(Array.isArray(data) ? data.filter((k: any) => k.jumlah_siswa > 0) : []))
  }, [tahunId])

  // Fetch preview counts
  useEffect(() => {
    if (!tahunId) { setPreview(null); return }
    const params = new URLSearchParams({ type, tahunId })
    if (kelasId) params.set('kelasId', kelasId)
    fetch(`/api/admin/export?preview=1&${params}`)
      .then(r => r.json())
      .then(data => setPreview({ siswa: data.siswa ?? 0, kelas: data.kelas ?? 0 }))
      .catch(() => setPreview(null))
  }, [type, tahunId, kelasId])

  async function handleExport() {
    if (!tahunId || !kelasId) {
      showToast('Pilih kelas terlebih dahulu', 'error')
      return
    }
    setIsLoading(true)
    try {
      const params = new URLSearchParams({ type, tahunId })
      if (kelasId)  params.set('kelasId', kelasId)
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo)   params.set('dateTo', dateTo)

      const kelasName = kelasId === 'all' ? 'SemuaKelas' : kelasList.find(k => k.id === kelasId)?.nama_kelas || 'Unknown'
      const filename = `Export_${kelasName}_${type}_${dateFrom}_${dateTo}.xlsx`
      await downloadFromUrl(`/api/admin/export?${params}`, filename)
      showToast('File berhasil didownload', 'success')
    } catch {
      showToast('Gagal mengekspor data', 'error')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-100 px-4 py-4 sticky top-14 md:top-0 z-30">
        <Breadcrumb />
        <h2 className="text-lg font-bold text-neutral-800">Export Data Per Kelas</h2>
        <p className="text-xs text-neutral-400 mt-0.5">Download data siswa (Mutabaah, Tahfiz, Wafa) ke file Excel (.xlsx)</p>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">

        {/* Jenis Data */}
        <section className="bg-white rounded-xl shadow-card border border-neutral-100 p-4">
          <h3 className="text-sm font-bold text-neutral-700 mb-3">Jenis Data</h3>
          <div className="space-y-2">
            {EXPORT_TYPES.map(t => (
              <button
                key={t.value}
                onClick={() => setType(t.value)}
                className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left',
                  type === t.value
                    ? 'border-primary-500 bg-primary-50'
                    : 'border-neutral-200 hover:border-neutral-300'
                )}
              >
                <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', type === t.value ? 'bg-primary-100 text-primary-600' : 'bg-neutral-100 text-neutral-400')}>
                  {t.icon}
                </div>
                <div className="flex-1">
                  <p className={cn('text-sm font-semibold', type === t.value ? 'text-primary-700' : 'text-neutral-700')}>{t.label}</p>
                  <p className="text-xs text-neutral-400">{t.desc}</p>
                </div>
                {type === t.value && <span className="text-primary-500 font-bold">✓</span>}
              </button>
            ))}
          </div>
        </section>

        {/* Filter */}
        <section className="bg-white rounded-xl shadow-card border border-neutral-100 p-4 space-y-3">
          <h3 className="text-sm font-bold text-neutral-700">Filter</h3>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Tahun Ajaran</label>
            <select value={tahunId} onChange={e => setTahunId(e.target.value)} className="w-full h-10 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              {tahunList.map(t => <option key={t.id} value={t.id}>{t.nama}{t.is_active ? ' (Aktif)' : ''}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-600 mb-1">Pilih Kelas <span className="text-danger">*</span></label>
            <select value={kelasId} onChange={e => setKelasId(e.target.value)} className="w-full h-10 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">-- Pilih Kelas untuk Export --</option>
              <option value="all">🌍 Semua Kelas (Export Lengkap)</option>
              {kelasList.map(k => <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>)}
            </select>
            {kelasId && kelasId !== 'all' && (
              <p className="text-xs text-primary-600 mt-1 font-medium">
                ✓ Export hanya untuk Kelas {kelasList.find(k => k.id === kelasId)?.nama_kelas}
              </p>
            )}
            {kelasId === 'all' && (
              <p className="text-xs text-amber-600 mt-1 font-medium">
                ⚠️ Export semua kelas (mungkin memakan waktu lama)
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Dari Tanggal</label>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="w-full h-10 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1">Sampai Tanggal</label>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="w-full h-10 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
          </div>
        </section>

        {/* Preview */}
        {preview && (
          <div className="bg-primary-50 rounded-xl border border-primary-200 p-4">
            <p className="text-xs font-semibold text-primary-600 mb-2">Ringkasan Export</p>
            <div className="grid grid-cols-3 gap-3 text-center">
              <div>
                <p className="text-lg font-bold text-primary-800">{preview.siswa}</p>
                <p className="text-[11px] text-primary-500">Siswa</p>
              </div>
              <div>
                <p className="text-lg font-bold text-primary-800">{preview.kelas}</p>
                <p className="text-[11px] text-primary-500">Kelas</p>
              </div>
              <div>
                <p className="text-sm font-bold text-primary-800 leading-tight">{formatTanggal(dateFrom)} - {formatTanggal(dateTo)}</p>
                <p className="text-[11px] text-primary-500">Periode</p>
              </div>
            </div>
          </div>
        )}

        {/* Tombol export */}
        <button
          onClick={handleExport}
          disabled={isLoading || !tahunId || !kelasId}
          className={cn(
            'w-full h-12 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all',
            isLoading || !tahunId || !kelasId ? 'bg-neutral-300 cursor-not-allowed' : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] shadow-md'
          )}
        >
          {isLoading ? (
            <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Mengekspor...</>
          ) : (
            <span className="flex items-center gap-2">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Download Excel
            </span>
          )}
        </button>
      </div>
      {ToastComponent}
    </div>
  )
}

function IconCheck() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconBook() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function IconStar() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}
