// ============================================================
// lib/utils/excel.ts
// Helper untuk generate template import dan manipulasi Excel
// ============================================================

import * as XLSX from 'xlsx'

// -----------------------------------------------------------
// Generate template Excel untuk import siswa
// -----------------------------------------------------------
export function generateImportTemplate(): Blob {
  const headers = ['nisn', 'nama_lengkap', 'jenis_kelamin', 'nama_orang_tua', 'no_hp', 'kelas']
  const contoh = [
    ['0123456701', 'Muhammad Azzam Al-Fatih', 'L', 'Bapak Ridwan',  '081234567001', '4.1'],
    ['0123456702', 'Aisyah Zahra Ramadhani',  'P', 'Ibu Kartini',   '081234567002', '4.2'],
  ]

  const ws = XLSX.utils.aoa_to_sheet([headers, ...contoh])

  // Style lebar kolom
  ws['!cols'] = [
    { wch: 15 },  // nisn
    { wch: 30 },  // nama_lengkap
    { wch: 15 },  // jenis_kelamin
    { wch: 25 },  // nama_orang_tua
    { wch: 18 },  // no_hp
    { wch: 10 },  // kelas
  ]

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Data Siswa')

  // Sheet petunjuk
  const petunjukData = [
    ['PETUNJUK PENGISIAN'],
    [''],
    ['Kolom', 'Keterangan', 'Wajib'],
    ['nisn',          'Nomor Induk Siswa Nasional (10 digit angka)', 'Ya'],
    ['nama_lengkap',  'Nama lengkap siswa',                         'Ya'],
    ['jenis_kelamin', 'L untuk laki-laki, P untuk perempuan',       'Tidak'],
    ['nama_orang_tua','Nama orang tua/wali',                        'Tidak'],
    ['no_hp',         'Nomor HP/WA orang tua',                      'Tidak'],
    ['kelas',         'Nama kelas (harus sesuai dengan kelas di sistem, contoh: 4.1, 4.2, 1.3)', 'Tidak'],
    [''],
    ['Catatan:'],
    ['- NISN harus tepat 10 digit angka'],
    ['- Jangan ubah nama kolom (baris pertama)'],
    ['- Hapus baris contoh sebelum upload'],
  ]
  const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData)
  wsPetunjuk['!cols'] = [{ wch: 20 }, { wch: 60 }, { wch: 10 }]
  XLSX.utils.book_append_sheet(wb, wsPetunjuk, 'Petunjuk')

  const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' })
  return new Blob([buf], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  })
}

// -----------------------------------------------------------
// Trigger download di browser
// -----------------------------------------------------------
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

// -----------------------------------------------------------
// Trigger download dari URL (untuk export dari server)
// -----------------------------------------------------------
export async function downloadFromUrl(url: string, filename: string) {
  const res  = await fetch(url)
  if (!res.ok) throw new Error('Gagal mendownload file')
  const blob = await res.blob()
  downloadBlob(blob, filename)
}
