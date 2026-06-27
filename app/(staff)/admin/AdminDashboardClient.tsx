'use client'

import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface Stats {
  totalSiswa:     number
  totalStaff:     number
  totalKelas:     number
  tahunAktif:     string
  mutabaahHariIni: number
  tahfizHariIni:  number
  wafaHariIni:    number
  totalSiswaAktif: number
}

interface ActivityItem {
  id: string
  time: string
  nama: string
}

interface KelasItem {
  id: string
  nama: string
  totalSiswaInKelas: number
  mutabaahTodayInKelas: number
}

export function AdminDashboardClient({
  stats,
  recentActivity,
  kelasList,
  kelasKosong,
  adminNama,
}: {
  stats: Stats
  recentActivity: { mutabaah: ActivityItem[]; tahfiz: ActivityItem[]; wafa: ActivityItem[] }
  kelasList: KelasItem[]
  kelasKosong: KelasItem[]
  adminNama: string
}) {
  const mutabaahRate = stats.totalSiswaAktif > 0
    ? Math.round((stats.mutabaahHariIni / stats.totalSiswaAktif) * 100)
    : 0

  return (
    <div className="p-4 md:p-6 max-w-4xl mx-auto space-y-6 dark:bg-neutral-900 min-h-screen">
      {/* Welcome banner */}
      <div className="bg-gradient-to-br from-primary-600 via-primary-500 to-primary-700 rounded-2xl p-5 text-white relative overflow-hidden">
        <div className="absolute -right-6 -top-6 w-32 h-32 bg-white/10 rounded-full" />
        <div className="absolute -right-2 -bottom-8 w-24 h-24 bg-white/5 rounded-full" />
        <div className="relative z-10">
          <p className="text-primary-100 text-xs font-medium uppercase tracking-wide">Tahun Ajaran {stats.tahunAktif}</p>
          <h1 className="text-2xl font-bold mt-1">Selamat Datang, {adminNama}</h1>
          <p className="text-primary-200 text-sm mt-0.5">Kelola data siswa dan mutabaah sekolah</p>
        </div>
      </div>

      {/* Ringkasan Sekolah */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Ringkasan Sekolah</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={stats.totalSiswa}
            label="Siswa Aktif"
            icon={<IconUsers />}
            color="from-blue-500 to-blue-600"
          />
          <StatCard
            value={stats.totalKelas}
            label="Kelas"
            icon={<IconKelas />}
            color="from-green-500 to-green-600"
          />
          <StatCard
            value={stats.totalStaff}
            label="Guru"
            icon={<IconStaff />}
            color="from-amber-500 to-amber-600"
          />
        </div>
      </div>

      {/* Warning: Kelas Kosong */}
      {kelasKosong.length > 0 && (
        <div className="bg-amber-50 dark:bg-amber-950 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900 flex items-center justify-center flex-shrink-0" aria-hidden="true">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#D97706" strokeWidth="2" strokeLinecap="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/>
                <line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                {kelasKosong.length} Kelas Kosong
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                Kelas berikut belum punya siswa. Pertimbangkan untuk menghapus atau mengisi siswa.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {kelasKosong.map(k => (
                  <Link
                    key={k.id}
                    href={/admin/kelas?kelasId=}
                    className="text-xs font-medium text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900 hover:bg-amber-200 dark:hover:bg-amber-800 px-2 py-1 rounded transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
                    aria-label={Kelola kelas }
                  >
                    {k.nama}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aktivitas Hari Ini */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Aktivitas Hari Ini</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Mutabaah */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-card border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-900 flex items-center justify-center">
                <IconCheck className="text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Mutabaah Hari Ini</p>
                <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{stats.mutabaahHariIni}</p>
              </div>
            </div>
            <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-2 mb-1">
              <div
                className={h-2 rounded-full transition-all duration-500 }
                style={{ width: ${Math.min(mutabaahRate, 100)}% }}
                role="progressbar"
                aria-valuenow={mutabaahRate}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={${mutabaahRate}% siswa sudah mengisi mutabaah}
              />
            </div>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{mutabaahRate}% dari {stats.totalSiswaAktif} siswa</p>
          </div>

          {/* Tahfiz */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-card border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900 flex items-center justify-center">
                <IconBook className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Tahfizh Hari Ini</p>
                <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{stats.tahfizHariIni}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{stats.tahfizHariIni} setoran</span>
            </div>
          </div>

          {/* Wafa */}
          <div className="bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-card border border-neutral-100 dark:border-neutral-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-amber-50 dark:bg-amber-900 flex items-center justify-center">
                <IconStar className="text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Wafa Hari Ini</p>
                <p className="text-xl font-bold text-neutral-800 dark:text-neutral-100">{stats.wafaHariIni}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-neutral-500 dark:text-neutral-400">{stats.wafaHariIni} setoran</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Aksi Cepat</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <QuickAction
            href="/admin/siswa"
            label="Tambah Siswa"
            color="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:border-primary-300 dark:hover:border-primary-600"
            icon={<IconUsers />}
          />
          <QuickAction
            href="/admin/kelas"
            label="Kelola Kelas"
            color="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:border-primary-300 dark:hover:border-primary-600"
            icon={<IconKelas />}
          />
          <QuickAction
            href="/admin/assign-guru"
            label="Penugasan Guru"
            color="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:border-primary-300 dark:hover:border-primary-600"
            icon={<IconAssign />}
          />
        </div>
      </div>

      {/* Recent Activity */}
      <div>
        <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Aktivitas Terbaru</h2>
        <div className="bg-white dark:bg-neutral-800 rounded-xl shadow-card border border-neutral-100 dark:border-neutral-700 overflow-hidden">
          {(() => {
            const allActivity = [
              ...recentActivity.mutabaah.map(a => ({ ...a, type: 'mutabaah' as const })),
              ...recentActivity.tahfiz.map(a => ({ ...a, type: 'tahfiz' as const })),
              ...recentActivity.wafa.map(a => ({ ...a, type: 'wafa' as const })),
            ]
              .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
              .slice(0, 8)

            return allActivity.length > 0 ? (
              allActivity.map((a, i) => (
                <div key={${a.type}-} className="flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 dark:hover:bg-neutral-750 transition-colors">
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0',
                    a.type === 'mutabaah' ? 'bg-green-50 dark:bg-green-900' : a.type === 'tahfiz' ? 'bg-emerald-50 dark:bg-emerald-900' : 'bg-amber-50 dark:bg-amber-900'
                  )} aria-hidden="true">
                    {a.type === 'mutabaah' ? <IconCheck className="text-green-600 dark:text-green-400 w-4 h-4" /> :
                     a.type === 'tahfiz' ? <IconBook className="text-emerald-600 dark:text-emerald-400 w-4 h-4" /> :
                     <IconStar className="text-amber-600 dark:text-amber-400 w-4 h-4" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200 truncate">
                      <span className="font-semibold">{a.nama}</span>
                      <span className="text-neutral-500 dark:text-neutral-400 ml-1">
                        {a.type === 'mutabaah' ? 'mengisi mutabaah' : a.type === 'tahfiz' ? 'setor tahfizh' : 'update wafa'}
                      </span>
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 dark:text-neutral-400 flex-shrink-0">
                    {formatTime(a.time)}
                  </span>
                </div>
              ))
            ) : (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-neutral-500 dark:text-neutral-400">Belum ada aktivitas hari ini</p>
              </div>
            )
          })()}
        </div>
      </div>

      {/* Ringkasan Per Kelas */}
      {kelasList.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mb-3">Ringkasan Per Kelas</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {kelasList.map((k, i) => {
              const mutabaahKelasRate = k.totalSiswaInKelas > 0
                ? Math.round((k.mutabaahTodayInKelas / k.totalSiswaInKelas) * 100)
                : 0

              return (
                <Link
                  key={k.id}
                  href={/admin/kelas?kelasId=}
                  className={cn(
                    'bg-white dark:bg-neutral-800 rounded-xl p-4 shadow-card border border-neutral-100 dark:border-neutral-700 hover:shadow-md hover:border-primary-300 dark:hover:border-primary-600 transition-all animate-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                  )}
                  style={{ animationDelay: ${i * 0.04}s }}
                  aria-label={Kelas ,  siswa, mutabaah %}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary-100 dark:bg-primary-900 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-700 dark:text-primary-300 font-bold text-sm">{k.nama.charAt(0)}</span>
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-neutral-800 dark:text-neutral-100">Kelas {k.nama}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{k.totalSiswaInKelas} siswa</p>
                    </div>
                  </div>
                  
                  <div className="mt-4">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-1">Mutabaah Hari Ini</p>
                    <div className="w-full bg-neutral-100 dark:bg-neutral-700 rounded-full h-1.5" role="progressbar" aria-valuenow={mutabaahKelasRate} aria-valuemin={0} aria-valuemax={100} aria-label={${mutabaahKelasRate}% siswa mengisi mutabaah}>
                      <div
                        className="bg-green-500 h-1.5 rounded-full transition-all duration-500"
                        style={{ width: ${Math.min(mutabaahKelasRate, 100)}% }}
                      />
                    </div>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">{mutabaahKelasRate}% ({k.mutabaahTodayInKelas} dari {k.totalSiswaInKelas})</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty state for no classes */}
      {kelasList.length === 0 && (
        <div className="bg-white dark:bg-neutral-800 rounded-xl p-8 text-center shadow-card border border-neutral-100 dark:border-neutral-700">
          <p className="text-4xl mb-3">🏫</p>
          <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">Belum ada kelas</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">Buat kelas baru untuk mulai memantau aktivitas siswa.</p>
          <Link
            href="/admin/kelas"
            className="inline-block mt-4 h-10 px-5 bg-primary-500 text-white rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors leading-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            aria-label="Buat kelas baru"
          >
            Buat Kelas
          </Link>
        </div>
      )}
    </div>
  )
}

function QuickAction({ href, label, icon, color }: {
  href: string; label: string; icon: React.ReactNode; color: string
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center gap-3 p-3.5 rounded-xl border transition-all active:scale-[0.97] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        color
      )}
      aria-label={label}
    >
      <span className="flex-shrink-0" aria-hidden="true">{icon}</span>
      <span className="text-sm font-semibold leading-tight">{label}</span>
    </Link>
  )
}

function StatCard({ value, label, icon, color }: {
  value: number; label: string; icon: React.ReactNode; color: string
}) {
  return (
    <div className={g-gradient-to-br  rounded-xl p-4 text-white relative overflow-hidden}>
      <div className="absolute -right-3 -bottom-3 w-16 h-16 bg-white/10 rounded-full" />
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2 opacity-80" aria-hidden="true">{icon}</div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-white/80 text-xs mt-0.5">{label}</p>
      </div>
    </div>
  )
}

function formatTime(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

import { IconUsers, IconStaff, IconKelas, IconCheck, IconCalendar, IconBook, IconStar, IconAssign, IconTrendUp, IconDownload, IconUpload } from '@/lib/icons'
