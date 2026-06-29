// ============================================================
// components/admin/ImportExcelModal.tsx
// Modal import siswa dari Excel — upload, preview, konfirmasi
// ============================================================

'use client'

import { useState, useEffect, useRef } from 'react'
import { useQueryClient }              from '@tanstack/react-query'
import { generateImportTemplate, downloadBlob } from '@/lib/utils/excel'
import { cn }                    from '@/lib/utils/cn'

interface ImportResult {
  total:   number
  valid:   number
  errors:  string[]
  preview: Array<{ nisn: string; nama_lengkap: string; nama_kelas?: string }>
}

interface Props {
  onClose:   () => void
  onSuccess: () => void
}

export function ImportExcelModal({ onClose, onSuccess }: Props) {
  const queryClient = useQueryClient()
  const fileRef  = useRef<HTMLInputElement>(null)
  const [file,        setFile]        = useState<File | null>(null)
  const [tahunId,     setTahunId]     = useState('')
  const [tahunList,   setTahunList]   = useState<Array<{ id: string; nama: string }>>([])
  const [preview,     setPreview]     = useState<ImportResult | null>(null)
  const [step,        setStep]        = useState<'upload' | 'preview' | 'done'>('upload')
  const [isLoading,   setIsLoading]   = useState(false)
  const [result,      setResult]      = useState<{ inserted: number; skipped: number } | null>(null)

  // Fetch tahun ajaran saat mount
  useEffect(() => {
    fetch('/api/admin/tahun-ajaran')
      .then(r => r.json())
      .then(data => {
        setTahunList(Array.isArray(data) ? data : [])
        const aktif = data.find((t: any) => t.is_active)
        if (aktif) setTahunId(aktif.id)
      })
  }, [])

  function handleDownloadTemplate() {
    const blob = generateImportTemplate()
    downloadBlob(blob, 'template_import_siswa.xlsx')
  }

  async function handlePreview() {
    if (!file || !tahunId) return
    setIsLoading(true)
    const fd = new FormData()
    fd.append('file',    file)
    fd.append('tahunId', tahunId)
    fd.append('preview', 'true')

    const res  = await fetch('/api/admin/import', { method: 'POST', body: fd })
    const data = await res.json()
    setPreview(data)
    setStep('preview')
    setIsLoading(false)
  }

  async function handleConfirmImport() {
    if (!file || !tahunId) return
    setIsLoading(true)
    const fd = new FormData()
    fd.append('file',    file)
    fd.append('tahunId', tahunId)

    const res  = await fetch('/api/admin/import', { method: 'POST', body: fd })
    const data = await res.json()

    if (res.ok) {
      setResult({ inserted: data.inserted, skipped: data.skipped })
      setStep('done')
      queryClient.invalidateQueries({ queryKey: ['kelas'] })
    }
    setIsLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-neutral-100 sticky top-0 bg-white">
          <h3 className="font-bold text-neutral-800">Import Siswa dari Excel</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 text-neutral-500">✕</button>
        </div>

        <div className="p-4 space-y-4">
          {/* Step: Upload */}
          {step === 'upload' && (
            <>
              {/* Download template */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-xs text-blue-700 font-semibold mb-2">Langkah 1: Download Template</p>
                <button
                  onClick={handleDownloadTemplate}
                  className="text-xs text-blue-600 underline font-medium"
                >
                  📥 Download template Excel
                </button>
              </div>

              {/* Pilih tahun ajaran */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">Tahun Ajaran</label>
                <select
                  value={tahunId}
                  onChange={e => setTahunId(e.target.value)}
                  className="w-full h-11 px-3 border border-neutral-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-300"
                >
                  <option value="">-- Pilih Tahun Ajaran --</option>
                  {tahunList.map(t => (
                    <option key={t.id} value={t.id}>{t.nama}</option>
                  ))}
                </select>
              </div>

              {/* Upload file */}
              <div>
                <label className="block text-sm font-semibold text-neutral-700 mb-1.5">File Excel (.xlsx)</label>
                <div
                  onClick={() => fileRef.current?.click()}
                  className={cn(
                    'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
                    file ? 'border-primary-400 bg-primary-50' : 'border-neutral-200 hover:border-neutral-300'
                  )}
                >
                  {file ? (
                    <div>
                      <p className="text-2xl mb-1">📊</p>
                      <p className="text-sm font-semibold text-primary-700">{file.name}</p>
                      <p className="text-xs text-neutral-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB</p>
                    </div>
                  ) : (
                    <div>
                      <p className="text-2xl mb-1">📁</p>
                      <p className="text-sm text-neutral-500">Tap untuk pilih file</p>
                      <p className="text-xs text-neutral-400">.xlsx saja</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                />
              </div>

              <button
                onClick={handlePreview}
                disabled={!file || !tahunId || isLoading}
                className={cn(
                  'w-full h-11 rounded-lg font-semibold text-sm text-white transition-all',
                  !file || !tahunId || isLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600'
                )}
              >
                {isLoading ? 'Memproses...' : 'Pratinjau Data →'}
              </button>
            </>
          )}

          {/* Step: Preview */}
          {step === 'preview' && preview && (
            <>
              {/* Summary */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-success">{preview.valid}</p>
                  <p className="text-xs text-neutral-500">Data Valid</p>
                </div>
                <div className="bg-red-50 rounded-lg p-3 text-center">
                  <p className="text-2xl font-bold text-danger">{preview.errors.length}</p>
                  <p className="text-xs text-neutral-500">Error</p>
                </div>
              </div>

              {/* Errors */}
              {preview.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 max-h-32 overflow-y-auto">
                  <p className="text-xs font-semibold text-danger mb-1">Error:</p>
                  {preview.errors.map((e, i) => (
                    <p key={i} className="text-xs text-red-600">• {e}</p>
                  ))}
                </div>
              )}

              {/* Preview tabel */}
              {preview.preview.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-neutral-600 mb-2">Preview (5 data pertama):</p>
                  <div className="space-y-1">
                    {preview.preview.map((r, i) => (
                      <div key={i} className="bg-neutral-50 rounded px-3 py-2 text-xs">
                        <span className="font-mono text-neutral-500">{r.nisn}</span>
                        <span className="mx-2">·</span>
                        <span className="font-medium">{r.nama_lengkap}</span>
                        {r.nama_kelas && <span className="ml-2 text-neutral-400">Kelas {r.nama_kelas}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={() => setStep('upload')} className="flex-1 h-11 border border-neutral-200 rounded-lg text-sm font-semibold text-neutral-600">
                  ← Kembali
                </button>
                <button
                  onClick={handleConfirmImport}
                  disabled={preview.valid === 0 || isLoading}
                  className={cn(
                    'flex-1 h-11 rounded-lg text-sm font-semibold text-white',
                    preview.valid === 0 || isLoading ? 'bg-neutral-300' : 'bg-primary-500 hover:bg-primary-600'
                  )}
                >
                  {isLoading ? 'Mengimport...' : `Import ${preview.valid} Siswa`}
                </button>
              </div>
            </>
          )}

          {/* Step: Done */}
          {step === 'done' && result && (
            <div className="text-center py-4">
              <p className="text-5xl mb-4">🎉</p>
              <p className="font-bold text-neutral-800 text-lg">Import Selesai!</p>
              <p className="text-sm text-neutral-500 mt-2">
                <span className="text-success font-semibold">{result.inserted} siswa</span> berhasil ditambahkan
                {result.skipped > 0 && <>, <span className="text-warning font-semibold">{result.skipped}</span> dilewati (NISN sudah ada)</>}
              </p>
              <button
                onClick={onSuccess}
                className="mt-6 w-full h-11 bg-primary-500 text-white rounded-lg font-semibold text-sm"
              >
                Selesai
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
