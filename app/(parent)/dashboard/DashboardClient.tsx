// ============================================================
// app/(parent)/dashboard/DashboardClient.tsx
// Dashboard interaktif orang tua - redesign + dark mode
// ============================================================

'use client'

import { useQueryClient }       from '@tanstack/react-query'
import { useEffect }            from 'react'
import { WeeklyChart, WeeklyChartSkeleton } from '@/components/mutabaah/WeeklyChart'
import { MonthlyHeatmap }       from '@/components/mutabaah/MonthlyHeatmap'
import { MutabaahChecklist }    from '@/components/mutabaah/MutabaahChecklist'
import { useTodayMutabaah, useWeeklyMutabaah } from '@/hooks/useMutabaah'
import { cn }                   from '@/lib/utils/cn'
import type { MutabaahDayData } from '@/lib/types/app'
import type { TahfizLog, WafaLog } from '@/lib/types/database'

interface DashboardClientProps {
  siswaName:        string
  namaKelas:        string
  jenisKelamin:     'L' | 'P' | null
  tanggalLabel:     string
  initialMutabaah:  MutabaahDayData
  tahfizLast:       Pick<TahfizLog, 'surah' | 'ayat_awal' | 'ayat_akhir' | 'status' | 'tanggal'> | null
  wafaLast:         Pick<WafaLog, 'jilid' | 'halaman' | 'status' | 'tanggal'> | null
}

const AVATAR_ICON: Record<'L' | 'P' | 'neutral', string> = {
  L: '👦',
  P: '👧',
  neutral: '🧒',
}

export function DashboardClient({
  siswaName,
  namaKelas,
  jenisKelamin,
  tanggalLabel,
  initialMutabaah,
  tahfizLast,
  wafaLast,
}: DashboardClientProps) {
  const queryClient = useQueryClient()

  useEffect(() => {
    queryClient.setQueryData(
      ['mutabaah', 'today', initialMutabaah.tanggal],
      initialMutabaah
    )
  }, [queryClient, initialMutabaah])

  const { data: todayData } = useTodayMutabaah(initialMutabaah.tanggal)
  const { data: weeklyData, isLoading: weeklyLoading } = useWeeklyMutabaah()

  const mutabaah = todayData ?? initialMutabaah

  return (
    <div className="px-4 py-4 space-y-4 max-w-lg mx-auto dark:bg-neutral-900 min-h-screen">

      {/* ========== IDENTITAS ANAK ========== */}
      <div className="bg-gradient-to-br from-primary-500 to-primary-600 rounded-2xl p-5 text-white animate-in">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <span className="text-2xl">{AVATAR_ICON[jenisKelamin ?? 'neutral']}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold truncate">{siswaName}</p>
            {namaKelas && (
              <p className="text-primary-100 text-sm mt-0.5">Kelas {namaKelas}</p>
            )}
          </div>
        </div>
      </div>

      {/* ========== CARD: Mutabaah Hari Ini ========== */}
      <section className="card animate-in" style={{ animationDelay: '0.05s' }}>
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">Mutabaah Hari Ini</h3>

        {mutabaah.items.length === 0 ? (
          <EmptyMutabaah />
        ) : (
          <MutabaahChecklist items={mutabaah.items} percentage={mutabaah.percentage} isLocked={mutabaah.is_locked} tanggal={mutabaah.tanggal} />
        )}
      </section>

      {/* ========== CARD: Konsistensi 7 Hari ========== */}
      <section className="card animate-in" style={{ animationDelay: '0.1s' }}>
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">
          📊 Konsistensi 7 Hari
        </h3>
        {weeklyLoading ? (
          <WeeklyChartSkeleton />
        ) : weeklyData ? (
          <WeeklyChart data={weeklyData} />
        ) : (
          <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-4">Data 7 hari belum tersedia</p>
        )}
      </section>

      {/* ========== CARD: Kalender Bulan Ini ========== */}
      <section className="card animate-in" style={{ animationDelay: '0.15s' }}>
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">
          📅 Kalender Ibadah
        </h3>
        <MonthlyHeatmap />
      </section>

      {/* ========== CARD: Tahfiz Terakhir ========== */}
      <section className="card animate-in" style={{ animationDelay: '0.2s' }}>
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">📖 Tahfiz</h3>
        {tahfizLast ? (
          <TahfizSummary data={tahfizLast} />
        ) : (
          <EmptyCard text="Belum ada data tahfiz" />
        )}
      </section>

      {/* ========== CARD: Wafa Terakhir ========== */}
      <section className="card animate-in" style={{ animationDelay: '0.25s' }}>
        <h3 className="font-bold text-neutral-800 dark:text-neutral-100 mb-3">📚 Wafa</h3>
        {wafaLast ? (
          <WafaSummary data={wafaLast} />
        ) : (
          <EmptyCard text="Belum ada data wafa" />
        )}
      </section>

      {/* Bottom spacer */}
      <div className="h-2" />
    </div>
  )
}

// -----------------------------------------------------------
// Sub-components
// -----------------------------------------------------------

const TAHFIZ_STATUS_LABEL: Record<string, string> = {
  setoran_baru: 'Setoran Baru',
  murajaah:     'Murajaah',
  lulus:        'OK Lulus',
}

const TAHFIZ_STATUS_COLOR: Record<string, string> = {
  setoran_baru: 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  murajaah:     'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300',
  lulus:        'bg-green-100 text-success dark:bg-green-900 dark:text-green-300',
}

function TahfizSummary({
  data,
}: {
  data: Pick<TahfizLog, 'surah' | 'ayat_awal' | 'ayat_akhir' | 'status' | 'tanggal'>
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">{data.surah}</p>
        {data.ayat_awal && data.ayat_akhir && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Ayat {data.ayat_awal}–{data.ayat_akhir}
          </p>
        )}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {formatDate(data.tanggal)}
        </p>
      </div>
      <span className={cn(
        'text-xs font-semibold px-2.5 py-1 rounded-full',
        TAHFIZ_STATUS_COLOR[data.status] ?? 'bg-neutral-100 text-neutral-500'
      )}>
        {TAHFIZ_STATUS_LABEL[data.status] ?? data.status}
      </span>
    </div>
  )
}

const WAFA_STATUS_LABEL: Record<string, string> = {
  naik:      '↑ Naik',
  lanjut:    '→ Lanjut',
  mengulang: '↩ Mengulang',
}

const WAFA_STATUS_COLOR: Record<string, string> = {
  naik:      'bg-green-100 text-success dark:bg-green-900 dark:text-green-300',
  lanjut:    'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300',
  mengulang: 'bg-amber-100 text-amber-600 dark:bg-amber-900 dark:text-amber-300',
}

function WafaSummary({
  data,
}: {
  data: Pick<WafaLog, 'jilid' | 'halaman' | 'status' | 'tanggal'>
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <div>
        <p className="font-semibold text-neutral-800 dark:text-neutral-200 text-sm">{data.jilid}</p>
        {data.halaman && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">Halaman {data.halaman}</p>
        )}
        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
          {formatDate(data.tanggal)}
        </p>
      </div>
      <span className={cn(
        'text-xs font-semibold px-2.5 py-1 rounded-full',
        WAFA_STATUS_COLOR[data.status] ?? 'bg-neutral-100 text-neutral-500'
      )}>
        {WAFA_STATUS_LABEL[data.status] ?? data.status}
      </span>
    </div>
  )
}

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('id-ID', { day: 'numeric', month: 'long' })
  } catch {
    return dateStr
  }
}

function EmptyCard({ text }: { text: string }) {
  return (
    <p className="text-sm text-neutral-500 dark:text-neutral-400 text-center py-2">{text}</p>
  )
}

function EmptyMutabaah() {
  return (
    <div className="text-center py-6">
      <p className="text-4xl mb-2">📋</p>
      <p className="text-sm text-neutral-600 dark:text-neutral-300 font-medium">
        Item mutabaah belum dikonfigurasi
      </p>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
        Hubungi admin sekolah untuk mengatur item ibadah
      </p>
    </div>
  )
}
