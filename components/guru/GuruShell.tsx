'use client'

import { useState, useEffect }               from 'react'
import Link                                    from 'next/link'
import { useRouter, usePathname }              from 'next/navigation'
import { createClient }                        from '@/lib/supabase/client'
import { cn }                                  from '@/lib/utils/cn'
import { GlobalSearch }                        from '@/components/ui/GlobalSearch'

const MENU_GROUPS = [
  {
    title: 'Menu',
    items: [
      { href: '/guru',             label: 'Dashboard',          icon: <IconDashboard /> },
      { href: '/guru/kelas',       label: 'Kelas / Mutabaah',   icon: <IconKelas /> },
      { href: '/guru/atur-mutabaah', label: 'Atur Item Mutabaah', icon: <IconSettings /> },
    ],
  },
  {
    title: 'Monitoring',
    items: [
      { href: '/guru/wafa',   label: 'Wafa',    icon: <IconWafa /> },
      { href: '/guru/tahfiz', label: 'Tahfizh', icon: <IconTahfiz /> },
    ],
  },
]

const SESSION_CACHE_KEY = 'simak-guru-session'

export function GuruShell({
  children,
  nama,
}: {
  children: React.ReactNode
  nama:     string
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

  // Cache session for faster subsequent navigations
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ nama }))
    } catch {}
  }, [nama])

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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-900 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-primary-800 dark:bg-neutral-950 text-white z-50">
        <SidebarContent
          nama={nama}
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
            <span className="font-display font-bold text-lg flex-1">SIMAK</span>
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
  )
}

// ─── Sidebar Content ──────────────────────────────────────
function SidebarContent({
  nama,
  pathname,
  darkMode,
  onToggleDark,
  onLogout,
  onClose,
}: {
  nama:          string
  pathname:      string
  darkMode:      boolean
  onToggleDark:  () => void
  onLogout:      () => void
  onClose?:      () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-16 border-b border-primary-700/50 dark:border-neutral-800 flex-shrink-0">
        <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center">
          <span className="text-white font-display font-bold text-sm">S</span>
        </div>
        <span className="font-display font-bold text-xl">SIMAK</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6" aria-label="Navigasi guru">
        {MENU_GROUPS.map((group) => (
          <div key={group.title}>
            <p className="text-xs font-semibold text-primary-200 dark:text-neutral-400 uppercase tracking-wider px-2 mb-2">
              {group.title}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
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
      <div className="border-t border-primary-700/50 dark:border-neutral-800 px-3 py-3 flex-shrink-0 space-y-1">
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{nama.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{nama}</p>
          </div>
        </div>
        <button
          onClick={onToggleDark}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 dark:text-neutral-400 hover:bg-white/10 hover:text-white dark:hover:bg-neutral-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label={darkMode ? 'Mode terang' : 'Mode gelap'}
        >
          {darkMode ? <SunIcon /> : <MoonIcon />}
          {darkMode ? 'Mode Terang' : 'Mode Gelap'}
        </button>
        <button
          onClick={onLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium text-primary-200 dark:text-neutral-400 hover:bg-white/10 hover:text-white dark:hover:bg-neutral-800 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
          aria-label="Keluar"
        >
          <LogoutIcon />
          Keluar
        </button>
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
