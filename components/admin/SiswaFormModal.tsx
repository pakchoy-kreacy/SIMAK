// ============================================================
// components/admin/SiswaFormModal.tsx
// Modal tambah / edit siswa
// ============================================================

'use client'

import { useState, useEffect } from 'react'
import { cn }                  from '@/lib/utils/cn'

interface SiswaRow {
  id:              string
  nisn:            string
  nama_lengkap:    string
  jenis_kelamin:   string | null
  parent_name:     string | null
  parent_phone:    string | null
  kelas:           string | null
}

interface KelasItem {
  id:         string
  nama_kelas: string
}

interface Props {
  siswa:     SiswaRow | null
  onClose:   () => void
  onSuccess: () => void
}

export function SiswaFormModal({ siswa, onClose, onSuccess }: Props) {
  const isEdit = !!siswa

  const [nisn,          setNisn]          = useState(siswa?.nisn           ?? '')
  const [nama,          setNama]          = useState(siswa?.nama_lengkap   ?? '')
  const [jenisKelamin,  setJenisKelamin]  = useState<'L' | 'P' | ''>((siswa?.jenis_kelamin as 'L' | 'P' | null) ?? '')
  const [parentName,    setParentName]    = useState(siswa?.parent_name    ?? '')
  const [parentPhone,   setParentPhone]   = useState(siswa?.parent_phone   ?? '')
  const [kelasId,       setKelasId]       = useState('')
  const [kelasList,     setKelasList]     = useState<KelasItem[]>([])
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [isLoading,     setIsLoading]     = useState(false)

  useEffect(() => {
    fetch('/api/admin/kelas')
      .then(r => r.json())
      .then(data => setKelasList(Array.isArray(data) ? data : []))
  }, [])

  function validate() {
    const e: Record<string, string> = {}
    if (!isEdit && !/^\d{10}$/.test(nisn)) e.nisn = 'NISN harus 10 digit angka'
    if (!nama.trim()) e.nama = 'Nama lengkap wajib diisi'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) return
    setIsLoading(true)

    const body = isEdit
      ? { namaLengkap: nama, jenisKelamin: jenisKelamin || null, parentName, parentPhone, kelasId: kelasId || undefined }
      : { nisn, namaLengkap: nama, jenisKelamin: jenisKelamin || null, parentName, parentPhone, kelasId: kelasId || undefined }

    const url    = isEdit ? `/api/admin/siswa/${siswa!.id}` : '/api/admin/siswa'
    const method = isEdit ? 'PATCH' : 'POST'

    const res  = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
    const data = await res.json()

    if (!res.ok) {
      setErrors({ submit: data.error ?? 'Terjadi kesalahan' })
      setIsLoading(false)
      return
    }

    onSuccess()
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white">
          <h3 className="font-bold text-neutral-800">{isEdit ? 'Edit Siswa' : 'Tambah Siswa'}</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {errors.submit && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-danger">{errors.submit}</p>
            </div>
          )}

          {/* NISN — hanya saat tambah */}
          {!isEdit && (
            <div>
              <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                NISN <span className="text-danger">*</span>
              </label>
              <input
                type="tel"
                inputMode="numeric"
                maxLength={10}
                value={nisn}
                onChange={e => setNisn(e.target.value.replace(/\D/g, ''))}
                placeholder="0123456789"
                className={cn(
                  'w-full h-11 px-4 border rounded-md text-sm font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-primary-300',
                  errors.nisn ? 'border-danger' : 'border-neutral-200'
                )}
              />
              {errors.nisn && <p className="text-xs text-danger mt-1">{errors.nisn}</p>}
            </div>
          )}

          {/* Nama lengkap */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Nama Lengkap <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={nama}
              onChange={e => setNama(e.target.value)}
              placeholder="Muhammad Azzam Al-Fatih"
              className={cn(
                'w-full h-11 px-4 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300',
                errors.nama ? 'border-danger' : 'border-neutral-200'
              )}
            />
            {errors.nama && <p className="text-xs text-danger mt-1">{errors.nama}</p>}
          </div>

          {/* Jenis kelamin */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Jenis Kelamin <span className="text-neutral-400 font-normal">(opsional)</span>
            </label>
            <select
              value={jenisKelamin}
              onChange={e => setJenisKelamin(e.target.value as 'L' | 'P' | '')}
              className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">-- Pilih Jenis Kelamin --</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
          </div>

          {/* Nama orang tua */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Nama Orang Tua <span className="text-neutral-400 font-normal">(opsional)</span>
            </label>
            <input
              type="text"
              value={parentName}
              onChange={e => setParentName(e.target.value)}
              placeholder="Bapak / Ibu ..."
              className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* No HP */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              No. HP / WhatsApp <span className="text-neutral-400 font-normal">(opsional)</span>
            </label>
            <input
              type="tel"
              value={parentPhone}
              onChange={e => setParentPhone(e.target.value)}
              placeholder="08123456789"
              className="w-full h-11 px-4 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>

          {/* Kelas */}
          <div>
            <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
              Kelas <span className="text-neutral-400 font-normal">(opsional)</span>
            </label>
            <select
              value={kelasId}
              onChange={e => setKelasId(e.target.value)}
              className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
            >
              <option value="">-- Pilih Kelas --</option>
              {kelasList.map(k => (
                <option key={k.id} value={k.id}>Kelas {k.nama_kelas}</option>
              ))}
            </select>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600 hover:bg-neutral-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className={cn(
                'flex-1 h-11 rounded-lg text-sm font-semibold text-white transition-all',
                isLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600'
              )}
            >
              {isLoading ? 'Menyimpan...' : isEdit ? 'Simpan Perubahan' : 'Tambah Siswa'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
