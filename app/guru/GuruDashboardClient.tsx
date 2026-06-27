'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface Stats {
  totalSiswa:    number
  totalKelas:    number
  tahunAktif:    string
  mutabaahToday: number
}

interface KelasCard {
  kelasId:      string
  namaKelas:    string
  nama:         string
  jumlahSiswa:  number
  mutabaahToday: number
  mutabaahRate: number
  totalItems:   number
  checkedItems: number
}

export function GuruDashboardClient({
  nama,
  stats,
  kelasCards,
}: {
  nama:        string
  stats:       Stats
  kelasCards:  KelasCard[]
}) {
  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 dark:bg-neutral-900 min-h-screen">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-primary-100 text-xs font-medium uppercase tracking-wide">
            {stats.tahunAktif !== 'Belum ada' ? `Tahun Ajaran ${stats.tahunAktif}` : 'Dashboard Guru'}
          </p>
          <h1 className="text-2xl font-bold mt-1">Halo, {nama.split(' ')[0]}!</h1>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-3xl font-bold relative z-10">{stats.totalSiswa}</p>
          <p className="text-blue-100 text-xs mt-0.5 relative z-10">Siswa</p>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-3xl font-bold relative z-10">{stats.totalKelas}</p>
          <p className="text-purple-100 text-xs mt-0.5 relative z-10">Kelas</p>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white relative overflow-hidden">
          <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/10 rounded-full" />
          <p className="text-3xl font-bold relative z-10">{stats.mutabaahToday}</p>
          <p className="text-green-100 text-xs mt-0.5 relative z-10">Mutabaah Hari Ini</p>
        </div>
      </div>

      {/* Per-class cards */}
      {kelasCards.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Kelas Saya</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {kelasCards.map(kelas => {
              const rate = kelas.jumlahSiswa > 0
                ? Math.round((kelas.mutabaahToday / kelas.jumlahSiswa) * 100)
                : 0

              return (
                <Link
                  key={kelas.kelasId}
                  href={`/guru/kelas?kelasId=${kelas.kelasId}`}
                  className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-100 dark:border-neutral-700 p-4 hover:shadow-md hover:border-primary-200 dark:hover:border-primary-700 transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                  aria-label={`Kelas ${kelas.nama}, ${kelas.jumlahSiswa} siswa, ${Math.round(kelas.mutabaahRate)}% mutabaah`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900 flex items-center justify-center" aria-hidden="true">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2D7A4F" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm text-neutral-800 dark:text-neutral-100">Kelas {kelas.namaKelas}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{kelas.jumlahSiswa} siswa · {kelas.totalItems} item aktif</p>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2 mb-1.5" role="progressbar" aria-valuenow={rate} aria-valuemin={0} aria-valuemax={100} aria-label={`${rate}% siswa sudah mengisi`}>
                    <div
                      className="h-2 rounded-full transition-all duration-500 bg-primary-500"
                      style={{ width: `${Math.min(rate, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{rate}% sudah mengisi hari ini</p>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {kelasCards.length === 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-8 text-center shadow-card border border-neutral-100 dark:border-neutral-700">
          <p className="text-4xl mb-3">📚</p>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Belum ada kelas</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Anda belum ditugaskan sebagai wali kelas untuk tahun ajaran ini.</p>
        </div>
      )}

      {/* Menu */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Menu</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Link
            href="/guru/kelas"
            className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white text-center hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-300"
            aria-label="Kelas dan Mutabaah"
          >
            <div className="flex justify-center mb-3 opacity-90" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <p className="font-bold text-sm">Kelas / Mutabaah</p>
          </Link>
          <Link
            href="/guru/atur-mutabaah"
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white text-center hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Atur Item Mutabaah"
          >
            <div className="flex justify-center mb-3 opacity-90" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <p className="font-bold text-sm">Atur Item</p>
          </Link>
          <Link
            href="/guru/tahfiz"
            className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white text-center hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
            aria-label="Tahfizh"
          >
            <div className="flex justify-center mb-3 opacity-90" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </svg>
            </div>
            <p className="font-bold text-sm">Tahfizh</p>
          </Link>
          <Link
            href="/guru/wafa"
            className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-6 text-white text-center hover:shadow-lg transition-all hover:scale-[1.02] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            aria-label="Wafa"
          >
            <div className="flex justify-center mb-3 opacity-90" aria-hidden="true">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
              </svg>
            </div>
            <p className="font-bold text-sm">Wafa</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
