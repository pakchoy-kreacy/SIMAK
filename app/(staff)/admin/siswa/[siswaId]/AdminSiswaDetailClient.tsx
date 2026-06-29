// ============================================================
// app/(staff)/admin/siswa/[siswaId]/AdminSiswaDetailClient.tsx
// ============================================================

'use client'

import { useState }  from 'react'
import { useRouter } from 'next/navigation'
import { useToast }  from '@/components/ui/Toast'
import { cn }        from '@/lib/utils/cn'

interface Props {
  siswa: {
    id:            string
    nisn:          string
    nama_lengkap:  string
    jenis_kelamin: string | null
    parent_name:   string | null
    parent_phone:  string | null
    photo_url:     string | null
    is_active:     boolean
  }
  kelasHistory: Array<{ namaKelas: string; tahunAjaran: string }>
}

export function AdminSiswaDetailClient({ siswa, kelasHistory }: Props) {
  const router = useRouter()
  const [nama,         setNama]         = useState(siswa.nama_lengkap)
  const [jenisKelamin, setJenisKelamin] = useState<'L' | 'P' | ''>((siswa.jenis_kelamin as 'L' | 'P' | null) ?? '')
  const [parentName,   setParentName]   = useState(siswa.parent_name ?? '')
  const [parentPhone,  setParentPhone]  = useState(siswa.parent_phone ?? '')
  const [isLoading,    setIsLoading]    = useState(false)
  const { showToast, ToastComponent } = useToast()

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsLoading(true)
    const res = await fetch(`/api/admin/siswa/${siswa.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ namaLengkap: nama, jenisKelamin: jenisKelamin || null, parentName, parentPhone }),
    })
    if (res.ok) {
      showToast('Data siswa diperbarui', 'success')
      setTimeout(() => router.push('/admin/siswa'), 1000)
    } else {
      const d = await res.json()
      showToast(d.error ?? 'Gagal menyimpan', 'error')
    }
    setIsLoading(false)
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <div className="bg-white border-b border-neutral-100 px-4 py-4">
        <button onClick={() => router.push('/admin/siswa')} className="flex items-center gap-1.5 text-primary-600 text-sm font-medium mb-3">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M15 18l-6-6 6-6" /></svg>
          Daftar Siswa
        </button>
        <h2 className="text-lg font-bold text-neutral-800">Detail Siswa</h2>
        <p className="text-xs text-neutral-400 mt-0.5">NISN: {siswa.nisn}</p>
      </div>

      <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
        <form onSubmit={handleSave} className="card space-y-4">
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Lengkap</label>
            <input type="text" value={nama} onChange={e => setNama(e.target.value)} className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" required />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Jenis Kelamin</label>
            <select value={jenisKelamin} onChange={e => setJenisKelamin(e.target.value as 'L' | 'P' | '')} className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300">
              <option value="">-- Pilih --</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Nama Orang Tua</label>
            <input type="text" value={parentName} onChange={e => setParentName(e.target.value)} className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">No. HP / WhatsApp</label>
            <input type="tel" value={parentPhone} onChange={e => setParentPhone(e.target.value)} className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
          </div>
          <button type="submit" disabled={isLoading} className={cn('w-full h-11 rounded-lg text-sm font-semibold text-white', isLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600')}>
            {isLoading ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </form>

        {/* Riwayat kelas */}
        {kelasHistory.length > 0 && (
          <section className="card">
            <h3 className="font-bold text-neutral-700 mb-3 text-sm">Riwayat Kelas</h3>
            <div className="space-y-2">
              {kelasHistory.map((h, i) => (
                <div key={i} className="flex items-center justify-between py-1.5 border-b border-neutral-100 last:border-0">
                  <span className="text-sm text-neutral-700">Kelas {h.namaKelas}</span>
                  <span className="text-xs text-neutral-400">{h.tahunAjaran}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Status aktif */}
        {!siswa.is_active && (
          <div className="bg-neutral-100 rounded-lg p-3 text-center">
            <p className="text-sm text-neutral-500 font-semibold">Siswa ini sudah dinonaktifkan</p>
          </div>
        )}
      </div>
      {ToastComponent}
    </div>
  )
}
