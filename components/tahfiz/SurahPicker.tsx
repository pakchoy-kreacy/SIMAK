// ============================================================
// components/tahfiz/SurahPicker.tsx
// Dropdown pencarian surah dari 114 surah (hardcoded)
// ============================================================

'use client'

import { useState, useRef, useEffect } from 'react'
import { SURAH_LIST, searchSurah }     from '@/lib/constants/surah'
import { cn }                          from '@/lib/utils/cn'

interface SurahPickerProps {
  value:    string
  onChange: (surah: string) => void
  error?:   string
  disabled?: boolean
}

export function SurahPicker({ value, onChange, error, disabled }: SurahPickerProps) {
  const [query,  setQuery]  = useState(value)
  const [isOpen, setIsOpen] = useState(false)
  const [results, setResults] = useState(SURAH_LIST)
  const containerRef = useRef<HTMLDivElement>(null)

  // Sync query dengan value dari luar
  useEffect(() => { setQuery(value) }, [value])

  // Close on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) {
        setIsOpen(false)
        // Jika query tidak sesuai surah yang dipilih, reset
        if (value && query !== value) setQuery(value)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [query, value])

  function handleInput(q: string) {
    setQuery(q)
    setResults(searchSurah(q))
    setIsOpen(true)
    if (!q) onChange('')
  }

  function handleSelect(latin: string) {
    onChange(latin)
    setQuery(latin)
    setIsOpen(false)
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (!disabled) { setResults(searchSurah(query)); setIsOpen(true) } }}
          placeholder="Cari nama surah... (contoh: Al-Fatihah)"
          disabled={disabled}
          className={cn(
            'w-full h-12 px-4 pr-10 border rounded-md text-sm',
            'focus:outline-none focus:ring-2 focus:ring-primary-300 focus:border-primary-400',
            error ? 'border-danger' : 'border-neutral-200',
            disabled && 'bg-neutral-100 cursor-not-allowed opacity-70'
          )}
        />
        {value && (
          <button
            type="button"
            onClick={() => { onChange(''); setQuery(''); setIsOpen(false) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600"
          >
            ✕
          </button>
        )}
      </div>

      {error && <p className="text-xs text-danger mt-1">{error}</p>}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-neutral-200 rounded-md shadow-elevated max-h-56 overflow-y-auto">
          {results.length === 0 ? (
            <div className="px-4 py-3 text-sm text-neutral-400 text-center">
              Surah tidak ditemukan
            </div>
          ) : (
            results.slice(0, 20).map(surah => (
              <button
                key={surah.nomor}
                type="button"
                onClick={() => handleSelect(surah.latin)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-primary-50 transition-colors',
                  value === surah.latin && 'bg-primary-50'
                )}
              >
                <span className="w-7 h-7 rounded-full bg-primary-100 text-primary-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {surah.nomor}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-neutral-800">{surah.latin}</p>
                  <p className="text-xs text-neutral-400">{surah.nama} · {surah.ayat} ayat</p>
                </div>
                {value === surah.latin && (
                  <span className="text-primary-500 text-sm">✓</span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  )
}
