// ============================================================
// components/mutabaah/MutabaahChecklist.tsx
// Form checklist ibadah harian — auto-save, optimistic update
// ============================================================

'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useToggleMutabaah }  from '@/hooks/useMutabaah'
import { useOfflineStore }    from '@/stores/offlineStore'
import { SurahPicker }        from '@/components/tahfiz/SurahPicker'
import { useToast }           from '@/components/ui/Toast'
import { cn }                 from '@/lib/utils/cn'
import type { MutabaahItemWithStatus } from '@/lib/types/app'

interface MutabaahChecklistProps {
  items:      MutabaahItemWithStatus[]
  tanggal:    string
  percentage: number
  isLocked:   boolean
}

export function MutabaahChecklist({
  items,
  tanggal,
  percentage,
  isLocked,
}: MutabaahChecklistProps) {
  const { mutate: toggle, isPending } = useToggleMutabaah()
  const { isOnline }   = useOfflineStore()
  const { showToast, ToastComponent } = useToast()
  const [savingId, setSavingId] = useState<string | null>(null)

  // Build hierarchy: parents + standalone items
  const parentItems = items.filter(i => !i.parent_id)
  const childItems  = items.filter(i => i.parent_id)
  const hierarchicalItems = parentItems.map(p => ({
    ...p,
    children: childItems.filter(c => c.parent_id === p.id),
  }))

  // Count leaf items only for progress bar
  const leafItems = hierarchicalItems.flatMap(p =>
    p.children.length > 0 ? p.children : [p]
  )
  const checkedCount = leafItems.filter(i => i.is_checked).length

  function handleToggle(item: MutabaahItemWithStatus) {
    if (isLocked) {
      showToast('Mutabaah sudah terkunci setelah pukul 23:59', 'warning')
      return
    }
    setSavingId(item.id)

    toggle(
      { itemId: item.id, tanggal, isChecked: !item.is_checked },
      {
        onSuccess: (data) => {
          setSavingId(null)
          if (!isOnline || (data as { queued?: boolean })?.queued) {
            showToast('Tersimpan offline — akan disinkronkan saat online', 'info')
          }
        },
        onError: () => {
          setSavingId(null)
          showToast('Gagal menyimpan. Coba lagi.', 'error')
        },
      }
    )
  }

  function handleTextSave(itemId: string, catatan: string) {
    if (isLocked) {
      showToast('Mutabaah sudah terkunci setelah pukul 23:59', 'warning')
      return
    }
    setSavingId(itemId)

    toggle(
      { itemId, tanggal, isChecked: catatan.length > 0, catatan: catatan || null },
      {
        onSuccess: () => { setSavingId(null) },
        onError: () => { setSavingId(null); showToast('Gagal menyimpan', 'error') },
      }
    )
  }

  return (
    <>
      {/* Progress Header */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-neutral-600">
            {checkedCount} dari {leafItems.length} ibadah
          </span>
          <span className={cn(
            'text-sm font-bold tabular-nums',
            percentage >= 80 ? 'text-success' :
            percentage >= 50 ? 'text-warning' : 'text-danger'
          )}>
            {percentage}%
          </span>
        </div>

        <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-500',
              percentage >= 80 ? 'bg-success' :
              percentage >= 50 ? 'bg-warning' : 'bg-danger'
            )}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>

      {isLocked && (
        <div className="mb-3 flex items-center gap-2 py-2 px-3 bg-neutral-100 rounded-md">
          <span className="text-neutral-400 text-sm">🔒</span>
          <p className="text-xs text-neutral-500">
            Mutabaah sudah terkunci. Data hari ini tidak dapat diubah.
          </p>
        </div>
      )}

      {!isOnline && (
        <div className="mb-3 flex items-center gap-2 py-2 px-3 bg-amber-50 border border-amber-200 rounded-md">
          <span className="text-amber-500 text-sm">📵</span>
          <p className="text-xs text-amber-700">
            Mode offline — perubahan akan tersinkron saat online kembali.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {hierarchicalItems.map((parent) => {
          const hasChildren = parent.children.length > 0
          const childrenChecked = parent.children.filter(c => c.is_checked).length
          const allDone = hasChildren && childrenChecked === parent.children.length

          return hasChildren ? (
            <div
              key={parent.id}
              className={cn(
                'rounded-lg border overflow-hidden',
                allDone ? 'bg-primary-50 border-primary-200' : 'bg-white border-neutral-200'
              )}
            >
              {/* Parent header — NOT toggleable */}
              <div className="flex items-center gap-3 p-3">
                <div className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold',
                  allDone ? 'bg-primary-500 text-white' : 'bg-neutral-200 text-neutral-500'
                )}>
                  {allDone ? '✓' : childrenChecked}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800">{parent.nama_item}</p>
                  <p className="text-xs text-neutral-400">{childrenChecked} dari {parent.children.length}</p>
                </div>
              </div>

              {/* Children */}
              <div className="px-3 pb-3 space-y-1.5 border-t border-neutral-100 pt-1.5">
                {parent.children.map((child, ci) => (
                  <MutabaahItem
                    key={child.id}
                    item={child}
                    isSaving={savingId === child.id}
                    isLocked={isLocked}
                    onToggle={() => handleToggle(child)}
                    onTextSave={(catatan) => handleTextSave(child.id, catatan)}
                    index={ci}
                  />
                ))}
              </div>
            </div>
          ) : (
            <MutabaahItem
              key={parent.id}
              item={parent}
              isSaving={savingId === parent.id}
              isLocked={isLocked}
              onToggle={() => handleToggle(parent)}
              onTextSave={(catatan) => handleTextSave(parent.id, catatan)}
              index={items.indexOf(parent)}
            />
          )
        })}
      </div>

      {ToastComponent}
    </>
  )
}

// -----------------------------------------------------------
// Satu item checklist — checkbox atau text input
// -----------------------------------------------------------
function MutabaahItem({
  item,
  isSaving,
  isLocked,
  onToggle,
  onTextSave,
  index,
}: {
  item:        MutabaahItemWithStatus
  isSaving:    boolean
  isLocked:    boolean
  onToggle:    () => void
  onTextSave:  (catatan: string) => void
  index:       number
}) {
  if (item.tipe === 'text') {
    return (
      <MutabaahTextItem
        item={item}
        isSaving={isSaving}
        isLocked={isLocked}
        onSave={onTextSave}
        index={index}
      />
    )
  }

  return (
    <button
      onClick={onToggle}
      disabled={isLocked || isSaving}
      className={cn(
        'w-full flex items-center gap-3 p-3.5 rounded-lg border transition-all duration-150',
        'active:scale-[0.98] text-left',
        'animate-in',
        item.is_checked
          ? 'bg-primary-50 border-primary-200'
          : 'bg-white border-neutral-200',
        isLocked && 'opacity-70 cursor-default',
        !isLocked && !isSaving && 'hover:border-primary-300 hover:shadow-sm'
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      {/* Checkbox visual */}
      <div className={cn(
        'w-7 h-7 rounded-full border-2 flex-shrink-0 flex items-center justify-center',
        'transition-all duration-200',
        item.is_checked
          ? 'bg-primary-500 border-primary-500 animate-check-bounce'
          : 'border-neutral-300 bg-white',
        isSaving && 'opacity-50'
      )}>
        {isSaving ? (
          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : item.is_checked ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M2.5 7L5.5 10L11.5 4" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : null}
      </div>

      {/* Label */}
      <span className={cn(
        'text-sm font-medium flex-1',
        item.is_checked ? 'text-primary-700' : 'text-neutral-700'
      )}>
        {item.nama_item}
      </span>

      {/* Status pill */}
      {item.is_checked && (
        <span className="text-xs text-primary-500 font-semibold bg-primary-100 px-2 py-0.5 rounded-full">
          ✓
        </span>
      )}
    </button>
  )
}

// -----------------------------------------------------------
// Surah list untuk dropdown tilawah
// -----------------------------------------------------------
const SURAH_LIST = [
  'Al-Fatihah', 'Al-Baqarah', 'Ali Imran', 'An-Nisa\'', 'Al-Ma\'idah',
  'Al-An\'am', 'Al-A\'raf', 'Al-Anfal', 'At-Taubah', 'Yunus',
  'Hud', 'Yusuf', 'Ar-Ra\'d', 'Ibrahim', 'Al-Hijr',
  'An-Nahl', 'Al-Isra\'', 'Al-Kahfi', 'Maryam', 'Taha',
  'Al-Anbiya\'', 'Al-Hajj', 'Al-Mu\'minun', 'An-Nur', 'Al-Furqan',
  'Asy-Syu\'ara\'', 'An-Naml', 'Al-Qasas', 'Al-\'Ankabut', 'Ar-Rum',
  'Luqman', 'As-Sajdah', 'Al-Ahzab', 'Saba\'', 'Fatir',
  'Yasin', 'As-Saffat', 'Sad', 'Az-Zumar', 'Gafir',
  'Fussilat', 'Asy-Syura', 'Az-Zukhruf', 'Ad-Dukhan', 'Al-Jasiyah',
  'Al-Ahqaf', 'Muhammad', 'Al-Fath', 'Al-Hujurat', 'Qaf',
  'Az-Zariyat', 'At-Tur', 'An-Najm', 'Al-Qamar', 'Ar-Rahman',
  'Al-Waqi\'ah', 'Al-Hadid', 'Al-Mujadilah', 'Al-Hasyr', 'Al-Mumtahanah',
  'As-Saff', 'Al-Jumu\'ah', 'Al-Munafiqun', 'At-Tagabun', 'At-Talaq',
  'At-Tahrim', 'Al-Mulk', 'Al-Qalam', 'Al-Haqqah', 'Al-Ma\'arij',
  'Nuh', 'Al-Jinn', 'Al-Muzzammil', 'Al-Muddassir', 'Al-Qiyamah',
  'Al-Insan', 'Al-Mursalat', 'An-Naba\'', 'An-Nazi\'at', '\'Abasa',
  'At-Takwir', 'Al-Infitar', 'Al-Mutaffifin', 'Al-Insyiqaq', 'Al-Buruj',
  'At-Tariq', 'Al-A\'la', 'Al-Gasyiyah', 'Al-Fajr', 'Al-Balad',
  'Asy-Syams', 'Al-Lail', 'Ad-Duha', 'Asy-Syarh', 'At-Tin',
  'Al-\'Alaq', 'Al-Qadr', 'Al-Bayyinah', 'Az-Zalzalah', 'Al-\'Adiyat',
  'Al-Qari\'ah', 'At-Takasur', 'Al-\'Asr', 'Al-Humazah', 'Al-Fil',
  'Quraisy', 'Al-Ma\'un', 'Al-Kausar', 'Al-Kafirun', 'An-Nasr',
  'Al-Lahab', 'Al-Ikhlas', 'Al-Falaq', 'An-Nas',
]

function parseCatatan(catatan: string | null): { surah: string; ayat: string } {
  if (!catatan) return { surah: '', ayat: '' }
  const idx = catatan.indexOf(':')
  if (idx === -1) return { surah: '', ayat: catatan }
  return { surah: catatan.slice(0, idx).trim(), ayat: catatan.slice(idx + 1).trim() }
}

// -----------------------------------------------------------
// Text input item — untuk tilawah / muroja'ah (input Surah + Ayat)
// -----------------------------------------------------------
function MutabaahTextItem({
  item,
  isSaving,
  isLocked,
  onSave,
  index,
}: {
  item:     MutabaahItemWithStatus
  isSaving: boolean
  isLocked: boolean
  onSave:   (catatan: string) => void
  index:    number
}) {
  const parsed = parseCatatan(item.catatan)
  const [surah, setSurah] = useState(parsed.surah)
  const [ayat, setAyat]   = useState(parsed.ayat)
  const timerRef           = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasSaved           = useRef(false)

  const doSave = useCallback((newSurah: string, newAyat: string) => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const c = newSurah && newAyat ? `${newSurah}: ${newAyat}` : ''
      if (c || hasSaved.current) {
        onSave(c)
        hasSaved.current = true
      }
    }, 600)
  }, [onSave])

  // Sync from server when item.catatan changes externally
  useEffect(() => {
    const p = parseCatatan(item.catatan)
    setSurah(p.surah)
    setAyat(p.ayat)
  }, [item.catatan])

  // Cleanup timer
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  const isFilled = item.is_checked && item.catatan

  return (
    <div
      className={cn(
        'rounded-lg border p-3 animate-in',
        isFilled ? 'bg-green-50 border-green-200' : 'bg-white border-neutral-200',
        isLocked && 'opacity-70'
      )}
      style={{ animationDelay: `${index * 0.03}s` }}
    >
      <p className={cn('text-sm font-semibold mb-2', isFilled ? 'text-green-700' : 'text-neutral-700')}>
        {item.nama_item}
        {isSaving && <span className="ml-2 inline-block w-3 h-3 border-2 border-primary-500 border-t-transparent rounded-full animate-spin align-middle" />}
      </p>

      <div className="space-y-2">
        {/* Surah searchable picker */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Surat</label>
          <SurahPicker
            value={surah}
            onChange={(s) => { setSurah(s); doSave(s, ayat) }}
          />
        </div>

        {/* Ayat input */}
        <div>
          <label className="block text-[11px] font-medium text-neutral-500 mb-1">Ayat (contoh: 1-5)</label>
          <input
            type="text"
            value={ayat}
            onChange={e => { setAyat(e.target.value); doSave(surah, e.target.value) }}
            onBlur={() => { if (surah && ayat) onSave(`${surah}: ${ayat}`) }}
            disabled={isLocked}
            placeholder="1-5"
            className="w-full h-9 px-3 border border-neutral-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 disabled:bg-neutral-100"
          />
        </div>
      </div>

      {isFilled && (
        <p className="text-xs text-green-600 mt-2 font-medium">
          ✓ {item.catatan}
        </p>
      )}
    </div>
  )
}
