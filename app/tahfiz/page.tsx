// ============================================================
// app/tahfiz/page.tsx
// Halaman tahfiz untuk orang tua (read-only)
// ============================================================

import { redirect }             from 'next/navigation'
import { getParentSession }     from '@/lib/auth/parent'
import { createServiceClient }  from '@/lib/supabase/server'
import { ParentShell }          from '@/components/ui/ParentShell'
import { cn }                   from '@/lib/utils/cn'

const STATUS_LABEL: Record<string, string> = {
  setoran_baru: 'Setoran Baru',
  murajaah:     'Murajaah',
  lulus:        'Lulus',
}

const STATUS_COLOR: Record<string, string> = {
  setoran_baru: 'bg-blue-100 text-blue-600',
  murajaah:     'bg-amber-100 text-amber-600',
  lulus:        'bg-green-100 text-green-700',
}

export default async function TahfizPage() {
  const parentSession = await getParentSession()

  if (!parentSession) redirect('/login')

  const supabase = createServiceClient()
  const { data: logs } = await supabase
    .from('tahfiz_log')
    .select('id, tanggal, surah, ayat_awal, ayat_akhir, status, catatan')
    .eq('siswa_id', parentSession.siswaId)
    .order('tanggal', { ascending: false })
    .limit(50)

  const { data: siswaData } = await supabase
    .from('siswa')
    .select('jenis_kelamin')
    .eq('id', parentSession.siswaId)
    .single()

  return (
    <ParentShell
      siswaName={parentSession.siswaName}
      siswaId={parentSession.siswaId}
      jenisKelamin={(siswaData?.jenis_kelamin as 'L' | 'P' | null) ?? null}
    >
      <div className="px-4 py-4 max-w-lg mx-auto">
        <div className="mb-4 animate-in">
          <h2 className="text-lg font-bold text-neutral-800">📖 Tahfiz Al-Qur&apos;an</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Riwayat setoran hafalan</p>
        </div>

        {!logs || logs.length === 0 ? (
          <div className="card text-center py-10 animate-in">
            <p className="text-4xl mb-3">📖</p>
            <p className="text-sm font-semibold text-neutral-600">Belum ada riwayat tahfiz</p>
            <p className="text-xs text-neutral-400 mt-1">Data akan muncul setelah guru menginput setoran</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={log.id} className="card animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-bold text-neutral-800">{log.surah}</p>
                    {log.ayat_awal && log.ayat_akhir && (
                      <p className="text-sm text-neutral-600 mt-0.5">
                        Ayat {log.ayat_awal}–{log.ayat_akhir}
                      </p>
                    )}
                    {log.catatan && (
                      <p className="text-xs text-neutral-500 mt-1.5 bg-neutral-50 rounded p-2 italic">
                        &ldquo;{log.catatan}&rdquo;
                      </p>
                    )}
                    <p className="text-xs text-neutral-400 mt-2">
                      {new Date(log.tanggal).toLocaleDateString('id-ID', {
                        weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
                      })}
                    </p>
                  </div>
                  <span className={cn(
                    'text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap flex-shrink-0',
                    STATUS_COLOR[log.status] ?? 'bg-neutral-100 text-neutral-500'
                  )}>
                    {STATUS_LABEL[log.status] ?? log.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </ParentShell>
  )
}
