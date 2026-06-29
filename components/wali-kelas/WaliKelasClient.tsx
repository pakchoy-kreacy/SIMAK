'use client'

import { useState, useEffect }           from 'react'
import { useQuery }           from '@tanstack/react-query'
import { useRouter }          from 'next/navigation'
import { getTodayWIB, formatTanggal } from '@/lib/utils/date'
import { SkeletonDashboard }  from '@/components/ui/Skeleton'
import { cn }                 from '@/lib/utils/cn'

// Design tokens untuk konsistensi
const ANIMATION_DELAY_BASE = 0.05 // seconds per item
const PROGRESS_THRESHOLD_HIGH = 80
const PROGRESS_THRESHOLD_MED = 50

interface SiswaStatus {
  siswaId:      string
  namaLengkap:  string
  photoUrl:     string | null
  namaKelas:    string
  kelasId:      string
  fillStatus:   'lengkap' | 'sebagian' | 'belum'
  percentage:   number
  checkedCount: number
  totalItems:   number
}

interface KelasStats {
  totalSiswa:    number
  sudahLengkap:  number
  sudahSebagian: number
  belumIsi:      number
  avgPercentage: number
  tanggal:       string
  namaKelas:     string
}

const STATUS_CONFIG = {
  lengkap:  { label: 'Lengkap',  color: 'text-success', bg: 'bg-green-50',  border: 'border-green-200', icon: '✅' },
  sebagian: { label: 'Sebagian', color: 'text-warning',  bg: 'bg-amber-50', border: 'border-amber-200',  icon: '⚠️' },
  belum:    { label: 'Belum',    color: 'text-danger',   bg: 'bg-red-50',   border: 'border-red-200',    icon: '❌' },
}
async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 2) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return res
    } catch (err) {
      if (i === maxRetries - 1) throw err
      await new Promise(r => setTimeout(r, 500 * (i + 1)))
    }
  }
  throw new Error('Max retries reached')
}

export function WaliKelasClient({ namaGuru, detailPath = '/wali-kelas' }: { namaGuru: string; detailPath?: string }) {
  const router  = useRouter()
  const tanggal = getTodayWIB()
  const [expandedKelas, setExpandedKelas] = useState<string | null>(null)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  const { data, isLoading, isError, refetch } = useQuery<{
    siswaList: SiswaStatus[]
    stats: KelasStats | null
  }>({
    queryKey: ['wali-kelas', tanggal],
    queryFn:  async () => {
      const res = await fetchWithRetry(`/api/staff/wali-kelas?tanggal=${tanggal}`)
      if (!res.ok) throw new Error('Gagal memuat data')
      return res.json()
    },
    staleTime:        60 * 1000,
    refetchInterval:  5 * 60 * 1000,
  })

  if (isLoading) return <SkeletonDashboard />

  if (isError) {
    return (
      <div className="p-4">
        <div className="card text-center py-10">
          <p className="text-danger font-semibold">Gagal memuat data</p>
          <button onClick={() => refetch()} className="mt-3 text-sm text-primary-500 underline">
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  const { siswaList = [], stats } = data ?? {}

  if (!stats) {
    return (
      <div className="p-4">
        <div className="bg-white rounded-xl shadow-card border border-neutral-100 text-center py-12">
          <div className="w-16 h-16 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-3">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
              <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
            </svg>
          </div>
          <p className="text-sm font-semibold text-neutral-600">Belum ada kelas yang ditugaskan</p>
          <p className="text-xs text-neutral-400 mt-1">Hubungi admin untuk penugasan kelas</p>
        </div>
      </div>
    )
  }

  // Group siswa by kelas
  const kelasMap = new Map<string, SiswaStatus[]>()
  for (const s of siswaList) {
    const arr = kelasMap.get(s.namaKelas) ?? []
    arr.push(s)
    kelasMap.set(s.namaKelas, arr)
  }
  const kelasEntries = Array.from(kelasMap.entries()).sort((a, b) => a[0].localeCompare(b[0]))

  // Default semua kelas collapsed untuk UX yang lebih baik
  // Expand per kelas untuk melihat detail siswa

  return (
    <div className="px-4 py-4 max-w-lg mx-auto space-y-4">
      {/* Greeting */}
      <div className="animate-in">
        <p className="text-xs text-neutral-400">{formatTanggal(tanggal)}</p>
        <h2 className="text-lg font-bold text-neutral-800 mt-0.5">
          Monitoring Mutabaah
        </h2>
      </div>

      {/* Per-class cards */}
      <div className="space-y-3">
        {kelasEntries.map(([namaKelas, siswa], ki) => {
          const total = siswa.length
          const lengkap = siswa.filter(s => s.fillStatus === 'lengkap').length
          const sebagian = siswa.filter(s => s.fillStatus === 'sebagian').length
          const belum = siswa.filter(s => s.fillStatus === 'belum').length
          const avgPct = Math.round(siswa.reduce((sum, s) => sum + s.percentage, 0) / total)
          const isExpanded = expandedKelas === namaKelas

          return (
            <div key={namaKelas} className="card animate-in" style={{ animationDelay: prefersReducedMotion ? '0s' : `${ki * ANIMATION_DELAY_BASE}s` }}>
              {/* Card header */}
              <button
                onClick={() => setExpandedKelas(isExpanded ? null : namaKelas)}
                className="w-full flex items-center gap-3 text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary-600 font-bold text-sm">{namaKelas}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-neutral-800">Kelas {namaKelas}</p>
                  <p className="text-xs text-neutral-400">{total} siswa</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn(
                    'text-sm font-bold',
                    avgPct >= PROGRESS_THRESHOLD_HIGH ? 'text-success' : avgPct >= PROGRESS_THRESHOLD_MED ? 'text-warning' : 'text-danger'
                  )}>
                    {avgPct}%
                  </p>
                  <p className="text-[10px] text-neutral-400">
                    {avgPct >= PROGRESS_THRESHOLD_HIGH ? 'Baik' : avgPct >= PROGRESS_THRESHOLD_MED ? 'Sedang' : 'Perlu ditingkatkan'}
                  </p>
                </div>
                <svg
                  width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round"
                  className={cn('transition-transform', isExpanded && 'rotate-180')}
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Mini stat bar */}
              <div className="flex gap-2 mt-3">
                <MiniStat value={lengkap} label="Lengkap" color="text-success" bg="bg-green-50" />
                <MiniStat value={sebagian} label="Sebagian" color="text-warning" bg="bg-amber-50" />
                <MiniStat value={belum} label="Belum" color="text-danger" bg="bg-red-50" />
              </div>

              {/* Progress bar */}
              <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden mt-3">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 to-primary-400 transition-all"
                  style={{ width: `${avgPct}%` }}
                />
              </div>

              {/* Expanded: student list */}
              {isExpanded && (
                <div className="mt-3 space-y-1.5 border-t border-neutral-100 pt-3">
                  {siswa.map((s, si) => {
                    const cfg = STATUS_CONFIG[s.fillStatus]
                    return (
                      <button
                        key={s.siswaId}
                        onClick={() => router.push(`${detailPath}/${s.siswaId}`)}
                        className={cn(
                          'w-full flex items-center gap-3 p-2.5 rounded-lg border text-left',
                          'hover:shadow-sm active:scale-[0.98] transition-all',
                          cfg.border
                        )}
                      >
                        <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                          {s.photoUrl ? (
                            <img src={s.photoUrl} alt={s.namaLengkap} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-neutral-500 font-bold text-xs">{s.namaLengkap.charAt(0)}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-neutral-800 truncate">{s.namaLengkap}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <div className="flex-1 h-1 bg-neutral-100 rounded-full overflow-hidden max-w-20">
                              <div className={cn('h-full rounded-full', cfg.color.replace('text-', 'bg-'))} style={{ width: `${s.percentage}%` }} />
                            </div>
                            <span className={cn('text-xs font-semibold tabular-nums', cfg.color)}>{s.percentage}%</span>
                          </div>
                        </div>
                        <span className="text-base flex-shrink-0">{cfg.icon}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MiniStat({ value, label, color, bg }: { value: number; label: string; color: string; bg: string }) {
  return (
    <div className={cn('flex-1 rounded-lg px-2 py-1.5 text-center', bg)}>
      <p className={cn('text-sm font-bold', color)}>{value}</p>
      <p className="text-[10px] text-neutral-500 leading-tight">{label}</p>
    </div>
  )
}
