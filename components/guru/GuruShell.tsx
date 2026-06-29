'use client'

import { useState, useEffect }               from 'react'
import Link                                    from 'next/link'
import { useRouter, usePathname }              from 'next/navigation'
import { createClient }                        from '@/lib/supabase/client'
import { cn }                                  from '@/lib/utils/cn'
import { GlobalSearch }                        from '@/components/ui/GlobalSearch'
import { SessionContext, type SessionData }    from '@/lib/auth/session-context'
import type { StaffRole }                      from '@/lib/types/app'

const MENU_GROUPS = [
  {
    title: 'Menu',
    roles: ['wali_kelas', 'admin'] as StaffRole[],
    items: [
      { href: '/guru',              label: 'Dashboard',          icon: <IconDashboard /> },
      { href: '/guru/kelas',        label: 'Kelas / Mutabaah',   icon: <IconKelas /> },
      { href: '/guru/atur-mutabaah', label: 'Atur Item Mutabaah', icon: <IconSettings /> },
    ],
  },
  {
    title: 'Penilaian',
    items: [
      { href: '/guru/tahfiz',       label: 'Tahfizh',            icon: <IconTahfiz /> },
      { href: '/guru/wafa',         label: 'Wafa',               icon: <IconWafa /> },
    ],
  },
]

const SESSION_CACHE_KEY = 'simak-guru-session'
const SESSION_COOKIE = 'simak-session'

export function GuruShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  const nama = session?.nama ?? ''
  const role = session?.role ?? 'wali_kelas'

  useEffect(() => {
    let cancelled = false

    function setSess(sess: SessionData) {
      if (cancelled) return
      setSession(sess)
      setLoading(false)
      try {
        sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(sess))
      } catch {}
    }

    async function loadSession() {
      // 1. Cookie (fastest — set by middleware)
      try {
        if (typeof document !== 'undefined') {
          const cookie = document.cookie.split('; ').find(r => r.startsWith(SESSION_COOKIE + '='))
          if (cookie) {
            const parsed = JSON.parse(decodeURIComponent(cookie.split('=')[1]))
            if (parsed.userId && parsed.role && parsed.nama) {
              const sess = { nama: parsed.nama, role: parsed.role, userId: parsed.userId, email: parsed.email ?? '', roles: parsed.roles ?? [parsed.role] }
              setSess(sess)
              return
            }
          }
        }
      } catch {}

      // 2. sessionStorage cache
      try {
        const cached = sessionStorage.getItem(SESSION_CACHE_KEY)
        if (cached) {
          const parsed = JSON.parse(cached)
          if (parsed.userId && parsed.role && parsed.nama) {
            setSess(parsed)
            return
          }
        }
      } catch {}

      // 3. API fallback
      try {
        const res = await fetch('/api/auth/session')
        if (res.ok) {
          const data = await res.json()
          const sess = { nama: data.nama, role: data.role, userId: data.userId, email: data.email ?? '', roles: data.roles ?? [data.role] }
          setSess(sess)
        } else {
          router.push('/login')
          if (!cancelled) setLoading(false)
        }
      } catch {
        router.push('/login')
        if (!cancelled) setLoading(false)
      }
    }

    loadSession()
    return () => { cancelled = true }
  }, [router])

  useEffect(() => {
    const saved = localStorage.getItem('simak-dark-mode')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const isDark = saved !== null ? saved === 'true' : prefersDark
    setDarkMode(isDark)
    document.documentElement.classList.toggle('dark', isDark)
  }, [])

  function toggleDarkMode() {
    const next = !darkMode
    setDarkMode(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('simak-dark-mode', String(next))
  }

  const parentPath = pathname.split('/').filter(Boolean).length > 2
    ? pathname.substring(0, pathname.lastIndexOf('/')) || '/guru'
    : null
  const isSubPage = parentPath !== null

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex">
        <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-primary-800 dark:bg-neutral-950 animate-pulse">
          <div className="px-5 h-16 flex items-center gap-3 border-b border-primary-700/50">
            <div className="w-9 h-9 bg-white/20 rounded-lg" />
            <div className="h-5 bg-white/20 rounded w-16" />
          </div>
          <div className="px-4 py-4 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-10 bg-white/10 rounded-lg" />)}
          </div>
        </aside>
        <div className="flex-1 md:ml-64 p-6 space-y-4">
          <div className="h-8 bg-neutral-200 dark:bg-neutral-700 rounded w-48 animate-pulse" />
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-xl animate-pulse" />)}
          </div>
        </div>
      </div>
    )
  }

  return (
    <SessionContext.Provider value={session}>
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-primary-800 dark:bg-neutral-950 text-white z-50">
        <SidebarContent
          nama={nama}
          role={role}
          pathname={pathname}
          darkMode={darkMode}
          onToggleDark={toggleDarkMode}
          onLogout={handleLogout}
        />
      </aside>

      {/* ── Mobile Sidebar Overlay ── */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 w-72 bg-primary-800 dark:bg-neutral-950 text-white shadow-2xl transition-transform animate-in slide-in-from-left">
            <SidebarContent
              nama={nama}
              role={role}
              pathname={pathname}
              darkMode={darkMode}
              onToggleDark={toggleDarkMode}
              onLogout={() => { setSidebarOpen(false); handleLogout() }}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden bg-primary-600 dark:bg-neutral-900 text-white sticky top-0 z-40 shadow-md">
          <div className="flex items-center h-14 px-4 gap-3">
            {isSubPage ? (
              <Link
                href={parentPath!}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 dark:hover:bg-neutral-700 transition-colors -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Kembali"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 dark:hover:bg-neutral-700 transition-colors -ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Buka menu"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            )}
            <div className="flex-1 flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 rounded overflow-hidden flex-shrink-0 bg-white">
                <img src="/logo.png" alt="SIMAK" className="w-full h-full object-contain" />
              </div>
              <div className="min-w-0">
                <p className="font-display font-bold text-base leading-tight truncate">SIMAK</p>
                <p className="text-primary-300 text-[9px] leading-tight truncate">SDIT Al-Kautsar Muko-Muko</p>
              </div>
            </div>
            <GlobalSearch />
            <button
              onClick={toggleDarkMode}
              className="w-8 h-8 bg-primary-700 dark:bg-neutral-800 hover:bg-primary-800 dark:hover:bg-neutral-700 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label={darkMode ? 'Mode terang' : 'Mode gelap'}
            >
              {darkMode ? <SunIcon /> : <MoonIcon />}
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 bg-primary-700 dark:bg-neutral-800 hover:bg-primary-800 dark:hover:bg-neutral-700 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Keluar"
            >
              <LogoutIcon />
            </button>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
    </SessionContext.Provider>
  )
}

// ─── Sidebar Content ──────────────────────────────────────
function SidebarContent({
  nama,
  role,
  pathname,
  darkMode,
  onToggleDark,
  onLogout,
  onClose,
}: {
  nama:          string
  role:          StaffRole
  pathname:      string
  darkMode:      boolean
  onToggleDark:  () => void
  onLogout:      () => void
  onClose?:      () => void
}) {
  const visibleGroups = MENU_GROUPS.filter(g => !g.roles || g.roles.includes(role))
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-primary-700/50 dark:border-neutral-800 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white">
          <img src="/logo.png" alt="SIMAK" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-xl leading-tight">SIMAK</p>
          <p className="text-primary-300 dark:text-neutral-400 text-[10px] leading-tight">SDIT Al-Kautsar Muko-Muko</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Navigasi guru">
        {visibleGroups.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold text-primary-200 dark:text-neutral-400 uppercase tracking-wider px-2 mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || (item.href !== '/guru' && pathname.startsWith(item.href + '/'))
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onClose}
                    className={cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50',
                      isActive
                        ? 'bg-white/15 text-white'
                        : 'text-primary-200 dark:text-neutral-400 hover:bg-white/10 hover:text-white dark:hover:bg-neutral-800'
                    )}
                    aria-label={item.label}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User profile + actions */}
      <div className="border-t border-primary-700/50 dark:border-neutral-800 px-4 py-2.5 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{nama.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{nama}</p>
          </div>
          <button
            onClick={onToggleDark}
            title={darkMode ? 'Mode terang' : 'Mode gelap'}
            className="w-8 h-8 bg-primary-700 dark:bg-neutral-800 hover:bg-primary-600 dark:hover:bg-neutral-700 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            aria-label={darkMode ? 'Mode terang' : 'Mode gelap'}
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={onLogout}
            title="Keluar"
            className="w-8 h-8 bg-primary-700 dark:bg-neutral-800 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
            aria-label="Keluar"
          >
            <LogoutIcon />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconKelas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function IconTahfiz() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}
function IconWafa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
  )
}
