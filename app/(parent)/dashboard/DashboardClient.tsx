// ============================================================
// app/(parent)/dashboard/DashboardClient.tsx
// Dashboard interaktif orang tua - redesign + dark mode
// ============================================================

'use client'

import { useQueryClient }       from '@tanstack/react-query'
import { useEffect, useState }  from 'react'
import { WeeklyChart, WeeklyChartSkeleton } from '@/components/mutabaah/WeeklyChart'
import { MonthlyHeatmap }       from '@/components/mutabaah/MonthlyHeatmap'
import { useTodayMutabaah, useWeeklyMutabaah, useToggleMutabaah } from '@/hooks/useMutabaah'
import { cn }                   from '@/lib/utils/cn'
import type { MutabaahDayData, MutabaahItemWithStatus } from '@/lib/types/app'
import type { TahfizLog, WafaLog } from '@/lib/types/database'

interface DashboardClientProps {
  siswaName:        string
  namaKelas:        string
  tanggalLabel:     string
  initialMutabaah:  MutabaahDayData
  tahfizLast:       Pick<TahfizLog, 'surah' | 'ayat_awal' | 'ayat_akhir' | 'status' | 'tanggal'> | null
  wafaLast:         Pick<WafaLog, 'jilid' | 'halaman' | 'status' | 'tanggal'> | null
}

export function DashboardClient({
  siswaName,
  namaKelas,
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
            <span className="text-2xl">👦</span>
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
          <MutabaahHarian items={mutabaah.items} percentage={mutabaah.percentage} isLocked={mutabaah.is_locked} tanggal={mutabaah.tanggal} />
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
// MutabaahHarian - Card progres dengan expand/collapse sub-item
// -----------------------------------------------------------
function MutabaahHarian({
  items,
  percentage,
  isLocked,
  tanggal,
}: {
  items:     MutabaahItemWithStatus[]
  percentage: number
  isLocked:   boolean
  tanggal:    string
}) {
  const [expandedParent, setExpandedParent] = useState<string | null>(null)

  return (
    <div>
      {/* Progress bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 bg-neutral-100 dark:bg-neutral-700 rounded-full h-2">
          <div
            className="bg-primary-500 h-2 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
            role="progressbar"
            aria-valuenow={percentage}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Progres mutabaah ${percentage}%`}
          />
        </div>
        <span className="text-sm font-bold text-primary-500 dark:text-primary-400 flex-shrink-0">{percentage}%</span>
      </div>

      {/* Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <div key={item.id}>
            {item.children && item.children.length > 0 ? (
              // Parent item dengan sub-items
              <div>
                <button
                  onClick={() => setExpandedParent(expandedParent === item.id ? null : item.id)}
                  className={cn(
                    'w-full flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                    'active:scale-[0.98] animate-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
                    item.is_checked
                      ? 'bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-800'
                      : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
                  )}
                  style={{ animationDelay: `${index * 0.03}s` }}
                  aria-expanded={expandedParent === item.id}
                  aria-label={item.nama_item + " - selesai"}
                >
                  <div className={cn(
                    'w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
                    item.is_checked
                      ? 'bg-primary-500 border-primary-500'
                      : 'border-neutral-300 dark:border-neutral-500 bg-white dark:bg-neutral-700',
                  )}>
                    {item.is_checked ? (
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    ) : null}
                  </div>

                  <span className={cn(
                    'text-sm font-medium flex-1',
                    item.is_checked ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'
                  )}>
                    {item.nama_item}
                  </span>

                  <span className="text-xs text-neutral-500 dark:text-neutral-400">
                    {item.children.filter(c => c.is_checked).length}/{item.children.length}
                  </span>

                  <svg
                    width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"
                    className={cn('transition-transform', expandedParent === item.id ? 'rotate-180' : '')}
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </button>

                {/* Child items */}
                {expandedParent === item.id && (
                  <div className="ml-6 mt-2 space-y-1.5">
                    {item.children.map((child, ci) => (
                      <ItemCheckbox
                        key={child.id}
                        item={child}
                        isLocked={isLocked}
                        isSaving={false}
                        onToggle={() => {}}
                        index={ci}
                      />
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Item tunggal (tanpa children)
              <ItemCheckbox
                item={item}
                isLocked={isLocked}
                isSaving={false}
                onToggle={() => {}}
                index={index}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// -----------------------------------------------------------
// ItemCheckbox - Item mutabaah tunggal dengan toggle
// -----------------------------------------------------------
function ItemCheckbox({
  item,
  isLocked,
  isSaving,
  onToggle,
  index,
}: {
  item:     MutabaahItemWithStatus
  isLocked: boolean
  isSaving: boolean
  onToggle: () => void
  index:    number
}) {
  return (
    <button
      onClick={onToggle}
      disabled={isLocked || isSaving}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-lg border transition-all text-left',
        'active:scale-[0.98] animate-in focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500',
        item.is_checked
          ? 'bg-primary-50 dark:bg-primary-900 border-primary-200 dark:border-primary-800'
          : 'bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700',
        isLocked && 'opacity-70 cursor-default'
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
      aria-label={item.nama_item}
    >
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all',
        item.is_checked
          ? 'bg-primary-500 border-primary-500'
          : 'border-neutral-300 dark:border-neutral-500 bg-white dark:bg-neutral-700',
        isSaving && 'opacity-50'
      )}>
        {isSaving ? (
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" role="status" aria-label="Menyimpan" />
        ) : item.is_checked ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>

      <span className={cn(
        'text-sm font-medium flex-1',
        item.is_checked ? 'text-primary-700 dark:text-primary-300' : 'text-neutral-700 dark:text-neutral-300'
      )}>
        {item.nama_item}
      </span>

      {item.is_checked && (
        <span className="text-xs text-primary-500 dark:text-primary-400 font-semibold bg-primary-100 dark:bg-primary-900 px-2 py-0.5 rounded-full">
          OK
        </span>
      )}
    </button>
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
