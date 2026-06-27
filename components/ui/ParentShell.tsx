// ============================================================
// components/ui/ParentShell.tsx
// Shell layout orang tua: top bar + bottom nav + offline banner
// ============================================================

'use client'

import Link                  from 'next/link'
import { usePathname }       from 'next/navigation'
import { useRouter }         from 'next/navigation'
import { useEffect, useState } from 'react'
import { useOfflineSync }    from '@/hooks/useOfflineSync'
import { useOfflineStore }   from '@/stores/offlineStore'
import { useParentStore }    from '@/stores/parentStore'
import { cn }                from '@/lib/utils/cn'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Beranda',  icon: HomeIcon },
  { href: '/kalender',  label: 'Kalender', icon: CalendarIcon },
  { href: '/tahfiz',    label: 'Tahfiz',   icon: BookIcon },
  { href: '/wafa',      label: 'Wafa',     icon: StarIcon },
]

export function ParentShell({
  children,
  siswaName,
  siswaId,
}: {
  children:  React.ReactNode
  siswaName: string
  siswaId:   string
}) {
  const pathname    = usePathname()
  const router      = useRouter()
  const { isOnline, pendingCount } = useOfflineStore()
  const { setSession } = useParentStore()
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    setSession(siswaId, siswaName)
  }, [siswaId, siswaName, setSession])

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

  useOfflineSync()

  async function handleLogout() {
    await fetch('/api/auth/parent-logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <div className='min-h-screen bg-neutral-50 dark:bg-neutral-900 flex flex-col'>
      {!isOnline && (
        <div className='bg-amber-500 text-white text-xs font-semibold text-center py-2 px-4 z-50' role='alert'>
          Mode Offline
          {pendingCount > 0 && <span> - {pendingCount} item menunggu sinkronisasi</span>}
        </div>
      )}

      <header className='bg-primary-500 dark:bg-neutral-900 text-white px-4 pt-safe-top sticky top-0 z-40 shadow-md'>
        <div className='flex items-center justify-between h-14'>
          <div className='flex items-center gap-2'>
            <span className='font-display font-bold text-xl'>SIMAK</span>
            {!isOnline && (
              <span className='bg-amber-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-semibold'>Offline</span>
            )}
          </div>
          <div className='flex items-center gap-2'>
            <button
              onClick={toggleDarkMode}
              className='w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
              aria-label={darkMode ? 'Mode terang' : 'Mode gelap'}
            >
              {darkMode ? (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><circle cx='12' cy='12' r='5'/><line x1='12' y1='1' x2='12' y2='3'/><line x1='12' y1='21' x2='12' y2='23'/><line x1='4.22' y1='4.22' x2='5.64' y2='5.64'/><line x1='18.36' y1='18.36' x2='19.78' y2='19.78'/><line x1='1' y1='12' x2='3' y2='12'/><line x1='21' y1='12' x2='23' y2='12'/><line x1='4.22' y1='19.78' x2='5.64' y2='18.36'/><line x1='18.36' y1='5.64' x2='19.78' y2='4.22'/></svg>
              ) : (
                <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round'><path d='M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z'/></svg>
              )}
            </button>
            <div className='flex items-center gap-2'>
              <div className='w-9 h-9 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0' aria-hidden='true'>
                <span className='text-lg'>&amp;#x1f466;</span>
              </div>
              <div className='text-right'>
                <p className='text-sm font-bold leading-tight line-clamp-1 max-w-32'>{siswaName}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className='w-8 h-8 bg-primary-600 dark:bg-neutral-800 hover:bg-primary-700 dark:hover:bg-neutral-700 rounded-full flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white'
              aria-label='Keluar'
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </header>

      <main className='flex-1 overflow-y-auto pb-safe'>{children}</main>

      <nav className='fixed bottom-0 left-0 right-0 bg-white dark:bg-neutral-800 border-t border-neutral-100 dark:border-neutral-700 bottom-nav z-40 shadow-[0_-2px_8px_rgba(0,0,0,0.06)]' aria-label='Navigasi utama'>
        <div className='flex'>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 transition-colors relative focus-visible:outline-none focus-visible:bg-primary-50 dark:focus-visible:bg-neutral-700',
                  isActive ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'
                )}
                aria-label={label}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon active={isActive} />
                <span className={cn(
                  'text-[10px] font-semibold leading-none',
                  isActive ? 'text-primary-500 dark:text-primary-400' : 'text-neutral-500 dark:text-neutral-400'
                )}>
                  {label}
                </span>
                {isActive && (
                  <span className='absolute top-0 w-6 h-0.5 bg-primary-500 dark:bg-primary-400 rounded-full' aria-hidden='true' />
                )}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function HomeIcon({ active }: { active: boolean }) {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M3 12L12 3L21 12V21H15V15H9V21H3V12Z' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} strokeLinejoin='round' fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
    </svg>
  )
}

function CalendarIcon({ active }: { active: boolean }) {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <rect x='3' y='4' width='18' height='18' rx='3' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d='M16 2V6M8 2V6M3 10H21' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} strokeLinecap='round' />
      <circle cx='12' cy='15' r='1.5' fill='currentColor' />
    </svg>
  )
}

function BookIcon({ active }: { active: boolean }) {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M4 4C4 4 6 3 12 3C18 3 20 4 20 4V20C20 20 18 19 12 19C6 19 4 20 4 20V4Z' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} strokeLinejoin='round' fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
      <path d='M12 3V19' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} />
    </svg>
  )
}

function StarIcon({ active }: { active: boolean }) {
  return (
    <svg width='22' height='22' viewBox='0 0 24 24' fill='none' aria-hidden='true'>
      <path d='M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z' stroke='currentColor' strokeWidth={active ? 2.5 : 1.8} strokeLinejoin='round' fill={active ? 'currentColor' : 'none'} fillOpacity={active ? 0.12 : 0} />
    </svg>
  )
}

function LogoutIcon() {
  return (
    <svg width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' aria-hidden='true'>
      <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4' />
      <polyline points='16 17 21 12 16 7' />
      <line x1='21' y1='12' x2='9' y2='12' />
    </svg>
  )
}