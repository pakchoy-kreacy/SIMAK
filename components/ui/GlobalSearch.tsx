'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils/cn'

interface SearchResult {
  type: 'siswa' | 'guru' | 'kelas'
  label: string
  sub: string
  href: string
}

const TYPE_BADGE: Record<string, string> = {
  siswa: 'bg-blue-100 text-blue-700',
  guru: 'bg-green-100 text-green-700',
  kelas: 'bg-amber-100 text-amber-700',
}

const TYPE_LABEL: Record<string, string> = {
  siswa: 'Siswa',
  guru: 'Guru',
  kelas: 'Kelas',
}

export function GlobalSearch() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`)
        const data = await res.json()
        setResults(data.results ?? [])
      } catch {
        setResults([])
      }
      setLoading(false)
    }, 300)
  }, [query])

  function handleSelect(href: string) {
    setOpen(false)
    setQuery('')
    setResults([])
    router.push(href)
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="h-9 px-3 sm:px-3 px-2 bg-neutral-100 hover:bg-neutral-200 text-neutral-500 text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <span className="hidden sm:inline">Cari...</span>
        <kbd className="hidden md:inline text-[10px] bg-white px-1.5 py-0.5 rounded border border-neutral-200 font-mono">⌘K</kbd>
      </button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-neutral-200 overflow-hidden animate-in"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 border-b border-neutral-100">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Cari siswa, guru, atau kelas..."
            className="flex-1 h-12 text-sm outline-none bg-transparent"
          />
          <kbd className="text-[10px] bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-400 font-mono">ESC</kbd>
        </div>

        <div className="max-h-80 overflow-y-auto">
          {query.length < 2 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-neutral-400">Ketik minimal 2 karakter untuk mencari</p>
            </div>
          ) : loading ? (
            <div className="px-4 py-8 text-center">
              <div className="w-6 h-6 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs text-neutral-400 mt-2">Mencari...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-xs text-neutral-400">Tidak ditemukan hasil untuk &quot;{query}&quot;</p>
            </div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.type}-${i}`}
                onClick={() => handleSelect(r.href)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50 transition-colors text-left"
              >
                <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full', TYPE_BADGE[r.type])}>
                  {TYPE_LABEL[r.type]}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-neutral-800 truncate">{r.label}</p>
                  <p className="text-[11px] text-neutral-400 truncate">{r.sub}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
