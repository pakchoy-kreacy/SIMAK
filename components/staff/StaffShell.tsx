'use client'

import { useState, useEffect }              from 'react'
import Link                                    from 'next/link'
import { useRouter, usePathname }              from 'next/navigation'
import { createClient }                        from '@/lib/supabase/client'
import { cn }                                  from '@/lib/utils/cn'
import { GlobalSearch }                        from '@/components/ui/GlobalSearch'
import { SessionContext, type SessionData }    from '@/lib/auth/session-context'
import type { StaffRole }                      from '@/lib/types/app'

const ROLE_LABEL: Record<StaffRole, string> = {
  admin:       'Admin',
  wali_kelas:  'Wali Kelas',
  guru_tahfiz: 'Guru Tahfiz',
  guru_wafa:   'Guru Wafa',
}

const ROLE_COLOR: Record<StaffRole, string> = {
  admin:       'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  wali_kelas:  'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  guru_tahfiz: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  guru_wafa:   'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
}

const SESSION_CACHE_KEY = 'simak-staff-session'
const SESSION_COOKIE = 'simak-session'

interface MenuItem {
  href:    string
  label:   string
  icon:    React.ReactNode
  roles?:  StaffRole[]
}

interface MenuGroup {
  title:   string
  items:   MenuItem[]
  roles?:  StaffRole[]
}

const MENU_GROUPS: MenuGroup[] = [
  {
    title: 'Data Master',
    roles: ['admin'],
    items: [
      { href: '/admin',              label: 'Dashboard',    icon: <IconDashboard /> },
      { href: '/admin/tahun-ajaran', label: 'Tahun Ajaran', icon: <IconTahun /> },
      { href: '/admin/siswa',        label: 'Siswa',        icon: <IconSiswa /> },
      { href: '/admin/kelas',        label: 'Kelas',        icon: <IconKelas /> },
      { href: '/admin/staff',        label: 'Guru',         icon: <IconStaff /> },
    ],
  },
  {
    title: 'Akademik',
    roles: ['admin'],
    items: [
      { href: '/admin/mutabaah-items', label: 'Template Mutabaah', icon: <IconMutabaah /> },
      { href: '/admin/assign-guru',     label: 'Penugasan Guru',    icon: <IconAssign /> },
      { href: '/admin/kenaikan-kelas',  label: 'Kenaikan Kelas',    icon: <IconKenaikan /> },
    ],
  },
  {
    title: 'Laporan',
    roles: ['admin'],
    items: [
      { href: '/admin/export', label: 'Export Data', icon: <IconExport /> },
    ],
  },
  {
    title: 'Akademik',
    roles: ['wali_kelas', 'guru_tahfiz', 'guru_wafa'],
    items: [
      { href: '/guru/tahfiz',  label: 'Tahfizh',   icon: <IconTahfiz /> },
      { href: '/guru/wafa',    label: 'Wafa',      icon: <IconWafa /> },
      { href: '/guru/kelas',   label: 'Wali Kelas', icon: <IconWaliKelas /> },
    ],
  },
]

export function StaffShell({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  const [session, setSession] = useState<{ nama: string; role: StaffRole; userId: string; email: string; roles: StaffRole[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const router   = useRouter()
  const pathname = usePathname()

  const nama = session?.nama ?? ''
  const role = session?.role ?? 'admin'

  useEffect(() => {
    let cancelled = false

    function setSess(sess: { nama: string; role: StaffRole; userId: string; email: string; roles: StaffRole[] }) {
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
            const parsed = JSON.parse(decodeURIComponent(cookie.substring(SESSION_COOKIE.length + 1)))
            if (parsed.userId && parsed.role && typeof parsed.nama === 'string' && parsed.nama.trim()) {
              const sess = { nama: parsed.nama, role: parsed.role as StaffRole, userId: parsed.userId, email: parsed.email ?? '', roles: (parsed.roles ?? [parsed.role]) as StaffRole[] }
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
          const sess = { nama: data.nama, role: data.role as StaffRole, userId: data.userId ?? '', email: data.email ?? '', roles: (data.roles ?? [data.role]) as StaffRole[] }
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

  // Role-based redirect (after session loaded)
  useEffect(() => {
    if (!loading && session && session.role !== 'admin') {
      router.push('/guru')
    }
  }, [loading, session, router])

  // Load dark mode preference
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

  const parentPath = pathname.split('/').filter(Boolean).length > 1
    ? pathname.substring(0, pathname.lastIndexOf('/')) || '/'
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
          <div className="px-5 h-12 flex items-center gap-3 border-b border-primary-700/50">
            <div className="w-10 h-10 rounded-lg bg-white/20" />
            <div className="flex-1 space-y-1"><div className="h-4 bg-white/20 rounded w-16" /><div className="h-2.5 bg-white/10 rounded w-24" /></div>
          </div>
          <div className="px-4 py-4 space-y-4">
            {[1,2,3,4,5].map(i => <div key={i} className="h-8 bg-white/10 rounded-lg" />)}
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
          <aside className="absolute inset-y-0 left-0 w-72 bg-primary-800 dark:bg-neutral-950 text-white shadow-2xl overflow-hidden sidebar-slide-in pt-safe pb-safe">
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
        <header className="md:hidden bg-primary-600 dark:bg-neutral-900 text-white sticky top-0 z-40 shadow-md pt-safe">
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
                aria-label="Buka menu sidebar"
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
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-12 border-b border-primary-700/50 dark:border-neutral-800 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white">
          <img src="/logo.png" alt="SIMAK" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-lg leading-tight">SIMAK</p>
          <p className="text-primary-300 dark:text-neutral-400 text-[11px] leading-tight">SDIT Al-Kautsar Muko-Muko</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 dark:hover:bg-neutral-800 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto px-2 pt-4 pb-0.5 space-y-0">
        {MENU_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role))
          if (visibleItems.length === 0) return null
          if (group.roles && !group.roles.includes(role)) return null

          return (
            <div key={group.title}>
              {groupIdx > 0 && (
                <div className="border-t border-primary-700/50 dark:border-neutral-800 my-1" />
              )}
              <p className="px-3 pt-0.5 pb-0.5 text-[10px] font-bold text-primary-400 dark:text-neutral-500 uppercase tracking-widest">
                {group.title}
              </p>
              <div className="space-y-0">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && item.href !== '/tahfiz' && item.href !== '/wafa' && item.href !== '/wali-kelas' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-1.5 rounded-lg text-sm font-medium transition-none relative',
                        isActive
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-primary-200 dark:text-neutral-400 hover:bg-white/10 hover:text-white dark:hover:bg-neutral-800'
                      )}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-white rounded-r-full" />
                      )}
                      <span className="w-5 h-5 flex items-center justify-center flex-shrink-0">{item.icon}</span>
                      <span className="truncate">{item.label}</span>
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
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
          >
            {darkMode ? <SunIcon /> : <MoonIcon />}
          </button>
          <button
            onClick={onLogout}
            title="Keluar"
            className="w-8 h-8 bg-primary-700 dark:bg-neutral-800 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Icons ─────────────────────────────────────────────────

function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="9" rx="1" /><rect x="14" y="3" width="7" height="5" rx="1" /><rect x="14" y="12" width="7" height="9" rx="1" /><rect x="3" y="16" width="7" height="5" rx="1" />
    </svg>
  )
}

function IconTahun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function IconKelas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" /><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  )
}

function IconSiswa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}

function IconStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><line x1="19" y1="8" x2="19" y2="14" /><line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}

function IconMutabaah() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}

function IconAssign() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}

function IconKenaikan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" /><polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function IconTahfiz() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  )
}

function IconWafa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  )
}

function IconWaliKelas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" /><line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" /><line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" /><line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" /><line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  )
}
