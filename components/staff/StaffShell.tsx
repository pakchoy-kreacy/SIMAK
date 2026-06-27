'use client'

import { useState }                            from 'react'
import Link                                    from 'next/link'
import { useRouter, usePathname }              from 'next/navigation'
import { createClient }                        from '@/lib/supabase/client'
import { cn }                                  from '@/lib/utils/cn'
import { GlobalSearch }                        from '@/components/ui/GlobalSearch'
import type { StaffRole }                      from '@/lib/types/app'

const ROLE_LABEL: Record<StaffRole, string> = {
  admin:       'Admin',
  wali_kelas:  'Wali Kelas',
  guru_tahfiz: 'Guru Tahfiz',
  guru_wafa:   'Guru Wafa',
}

const ROLE_COLOR: Record<StaffRole, string> = {
  admin:       'bg-blue-100 text-blue-700',
  wali_kelas:  'bg-green-100 text-green-700',
  guru_tahfiz: 'bg-emerald-100 text-emerald-700',
  guru_wafa:   'bg-amber-100 text-amber-700',
}

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
      { href: '/admin/kelas',        label: 'Kelas',        icon: <IconKelas /> },
      { href: '/admin/siswa',        label: 'Siswa',        icon: <IconSiswa /> },
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
    items: [
      { href: '/tahfiz',     label: 'Tahfizh',   icon: <IconTahfiz />,   roles: ['guru_tahfiz'] },
      { href: '/wafa',       label: 'Wafa',       icon: <IconWafa />,     roles: ['guru_wafa'] },
      { href: '/wali-kelas', label: 'Wali Kelas', icon: <IconWaliKelas />, roles: ['wali_kelas'] },
    ],
  },
]

export function StaffShell({
  children,
  nama,
  role,
}: {
  children: React.ReactNode
  nama:     string
  role:     StaffRole
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const router   = useRouter()
  const pathname = usePathname()

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

  return (
    <div className="min-h-screen bg-neutral-50 flex">
      {/* ── Desktop Sidebar ── */}
      <aside className="hidden md:flex md:flex-col md:w-64 md:fixed md:inset-y-0 bg-primary-800 text-white z-50">
        <SidebarContent
          nama={nama}
          role={role}
          pathname={pathname}
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
          <aside className="absolute inset-y-0 left-0 w-72 bg-primary-800 text-white shadow-2xl transition-transform duration-200 animate-in slide-in-from-left">
            <SidebarContent
              nama={nama}
              role={role}
              pathname={pathname}
              onLogout={() => { setSidebarOpen(false); handleLogout() }}
              onClose={() => setSidebarOpen(false)}
            />
          </aside>
        </div>
      )}

      {/* ── Main Area ── */}
      <div className="flex-1 md:ml-64 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="md:hidden bg-primary-600 text-white sticky top-0 z-40 shadow-md">
          <div className="flex items-center h-14 px-4 gap-3">
            {isSubPage ? (
              <Link
                href={parentPath!}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 transition-colors -ml-1"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M15 18l-6-6 6-6" />
                </svg>
              </Link>
            ) : (
              <button
                onClick={() => setSidebarOpen(true)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 transition-colors -ml-1"
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
              onClick={handleLogout}
              title="Keluar"
              className="w-8 h-8 bg-primary-700 hover:bg-primary-800 rounded-full flex items-center justify-center transition-colors"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
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

// ─── Sidebar Content ────────────────────────────────
function SidebarContent({
  nama,
  role,
  pathname,
  onLogout,
  onClose,
}: {
  nama:          string
  role:          StaffRole
  pathname:      string
  onLogout:      () => void
  onClose?:      () => void
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 h-14 border-b border-primary-700/50 flex-shrink-0">
        <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-white">
          <img src="/logo.png" alt="SIMAK" className="w-full h-full object-contain" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-lg leading-tight">SIMAK</p>
          <p className="text-primary-300 text-[10px] leading-tight">SDIT Al-Kautsar Muko-Muko</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-primary-700 transition-colors"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>

      {/* Menu Groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-1 space-y-0.5">
        {MENU_GROUPS.map((group, groupIdx) => {
          const visibleItems = group.items.filter(item => !item.roles || item.roles.includes(role))
          if (visibleItems.length === 0) return null
          if (group.roles && !group.roles.includes(role)) return null

          return (
            <div key={group.title}>
              {groupIdx > 0 && (
                <div className="border-t border-primary-700/50 my-2" />
              )}
              <p className="px-3 pt-1 pb-1 text-[10px] font-bold text-primary-400 uppercase tracking-widest">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {visibleItems.map((item) => {
                  const isActive = pathname === item.href ||
                    (item.href !== '/admin' && item.href !== '/tahfiz' && item.href !== '/wafa' && item.href !== '/wali-kelas' && pathname.startsWith(item.href))
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-150 relative',
                        isActive
                          ? 'bg-white/20 text-white shadow-sm'
                          : 'text-primary-200 hover:bg-white/10 hover:text-white'
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

      {/* User profile + logout */}
      <div className="border-t border-primary-700/50 px-4 py-2 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-white/15 flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-sm">{nama.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-white truncate leading-tight">{nama}</p>
            <p className="text-primary-300 text-[11px] leading-tight">{ROLE_LABEL[role]}</p>
          </div>
          <button
            onClick={onLogout}
            title="Keluar"
            className="w-8 h-8 bg-primary-700 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors flex-shrink-0"
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

// ─── Icons ──────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconSiswa() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  )
}
function IconTahun() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}
function IconMutabaah() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" />
      <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  )
}
function IconStaff() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <line x1="19" y1="8" x2="19" y2="14" />
      <line x1="22" y1="11" x2="16" y2="11" />
    </svg>
  )
}
function IconExport() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}
function IconKenaikan() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}
function IconTahfiz() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
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
function IconWaliKelas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
function IconAssign() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="23" y1="11" x2="17" y2="11" />
    </svg>
  )
}
function IconKelas() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  )
}
