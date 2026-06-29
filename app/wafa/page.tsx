// ============================================================
// app/wafa/page.tsx
// Halaman wafa untuk orang tua (read-only)
// ============================================================

import { redirect }             from 'next/navigation'
import { getParentSession }     from '@/lib/auth/parent'
import { createServiceClient }  from '@/lib/supabase/server'
import { ParentShell }          from '@/components/ui/ParentShell'
import { cn }                   from '@/lib/utils/cn'

const STATUS_LABEL: Record<string, string> = {
  naik:      '↑ Naik',
  lanjut:    '→ Lanjut',
  mengulang: '↩ Mengulang',
}

const STATUS_COLOR: Record<string, string> = {
  naik:      'bg-green-100 text-green-700',
  lanjut:    'bg-blue-100 text-blue-700',
  mengulang: 'bg-amber-100 text-amber-700',
}

const JILID_ICON: Record<string, string> = {
  'Jilid 1': '1️⃣',
  'Jilid 2': '2️⃣',
  'Jilid 3': '3️⃣',
  'Jilid 4': '4️⃣',
  'Jilid 5': '5️⃣',
  'Jilid 6': '6️⃣',
  'Al-Qur\'an': '📖',
}

export default async function WafaPage() {
  const parentSession = await getParentSession()

  if (!parentSession) redirect('/login')

  const supabase = createServiceClient()
  const { data: logs } = await supabase
    .from('wafa_log')
    .select('id, tanggal, jilid, halaman, status, catatan')
    .eq('siswa_id', parentSession.siswaId)
    .order('tanggal', { ascending: false })
    .limit(50)

  const currentLevel = logs?.[0]?.jilid ?? null

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
          <h2 className="text-lg font-bold text-neutral-800">📚 Wafa</h2>
          <p className="text-xs text-neutral-400 mt-0.5">Riwayat progres metode Wafa</p>
        </div>

        {currentLevel && (
          <div className="card bg-primary-50 border border-primary-200 mb-4 animate-in">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{JILID_ICON[currentLevel] ?? '📚'}</span>
              <div>
                <p className="text-xs text-primary-600 font-medium">Level Saat Ini</p>
                <p className="font-bold text-primary-800">{currentLevel}</p>
              </div>
            </div>
          </div>
        )}

        {!logs || logs.length === 0 ? (
          <div className="card text-center py-10 animate-in">
            <p className="text-4xl mb-3">📚</p>
            <p className="text-sm font-semibold text-neutral-600">Belum ada riwayat Wafa</p>
            <p className="text-xs text-neutral-400 mt-1">Data akan muncul setelah guru menginput progres</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log, i) => (
              <div key={log.id} className="card animate-in" style={{ animationDelay: `${i * 0.04}s` }}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{JILID_ICON[log.jilid] ?? '📚'}</span>
                      <p className="font-bold text-neutral-800">{log.jilid}</p>
                    </div>
                    {log.halaman && (
                      <p className="text-sm text-neutral-600 mt-0.5">Halaman {log.halaman}</p>
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
