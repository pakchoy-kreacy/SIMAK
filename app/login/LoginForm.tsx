'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter }                from 'next/navigation'
import { createClient }             from '@/lib/supabase/client'
import { cn }                       from '@/lib/utils/cn'

type Tab = 'orangtua' | 'staff'

const WA_NUMBER = '6282315483769'
const WA_TEXT = 'Maaf%20Pak,%20saya%20orang%20tua%20dari%20........%20lupa%20NISN%20anak%20saya.'

export function LoginForm() {
  const router = useRouter()
  const [tab, setTab]           = useState<Tab>('orangtua')
  const [nisn, setNisn]         = useState('')
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [isPending, startTransition] = useTransition()
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [canInstall, setCanInstall] = useState(false)
  const [isStandalone, setIsStandalone] = useState(false)

  useEffect(() => {
    setIsStandalone(
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    )

    function handler(e: Event) {
      e.preventDefault()
      setDeferredPrompt(e)
      setCanInstall(true)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  async function handleInstall() {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
    }
    setDeferredPrompt(null)
  }

  async function handleParentLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!/^\d{10}$/.test(nisn)) {
      setError('NISN harus 10 digit angka.')
      return
    }

    startTransition(async () => {
      try {
        const res = await fetch('/api/auth/parent-login', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ nisn }),
        })
        const data = await res.json()

        if (!data.success) {
          setError(data.error ?? 'NISN tidak ditemukan.')
          return
        }

        router.push('/dashboard')
        router.refresh()
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    })
  }

  async function handleStaffLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    startTransition(async () => {
      try {
        const supabase = createClient()
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password,
        })

        if (authError || !data.user) {
          setError('Email atau password salah.')
          return
        }

        const { data: profile } = await supabase
          .from('user_profile')
          .select('role, is_active')
          .eq('id', data.user.id)
          .single()

        if (!profile?.is_active) {
          setError('Akun tidak aktif. Hubungi admin.')
          return
        }

        router.push(profile.role === 'admin' ? '/admin' : '/guru')
        router.refresh()
      } catch {
        setError('Terjadi kesalahan. Silakan coba lagi.')
      }
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 via-primary-500 to-primary-600 islamic-pattern flex flex-col">
      {/* Main content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pt-12 pb-6">
        {/* Logo & branding */}
        <div className="text-center mb-8 animate-in">
          <div className="w-28 h-28 rounded-2xl overflow-hidden mx-auto mb-4 shadow-xl">
            <img src="/logo.png" alt="Logo SIMAK" className="w-full h-full object-contain bg-white" />
          </div>
          <h1 className="font-display text-white text-4xl font-bold tracking-wide">
            SIMAK
          </h1>
          <p className="text-primary-100 text-sm mt-1 font-body">
            Monitoring Akhlak & Karakter
          </p>
          <p className="text-primary-200 text-xs mt-1 font-body leading-relaxed max-w-xs mx-auto">
            Aplikasi Monitoring Akhlak dan Karakter<br />SDIT Al-Kautsar Muko-Muko
          </p>
        </div>

        {/* Card form */}
        <div className="w-full max-w-sm bg-white rounded-xl shadow-elevated overflow-hidden animate-in"
             style={{ animationDelay: '0.1s' }}>

          {/* Tab switcher */}
          <div className="flex border-b border-neutral-100">
            <button
              onClick={() => { setTab('orangtua'); setError('') }}
              className={cn(
                'flex-1 py-3.5 text-sm font-semibold transition-colors duration-200',
                tab === 'orangtua'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-50'
                  : 'text-neutral-400 hover:text-neutral-600'
              )}
            >
              Orang Tua
            </button>
            <button
              onClick={() => { setTab('staff'); setError('') }}
              className={cn(
                'flex-1 py-3.5 text-sm font-semibold transition-colors duration-200',
                tab === 'staff'
                  ? 'text-primary-500 border-b-2 border-primary-500 bg-primary-50'
                  : 'text-neutral-400 hover:text-neutral-600'
              )}
            >
              Guru / Admin
            </button>
          </div>

          <div className="p-6">
            {/* Error message */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Form Orang Tua */}
            {tab === 'orangtua' && (
              <form onSubmit={handleParentLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    NISN Anak
                  </label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    pattern="\d{10}"
                    maxLength={10}
                    value={nisn}
                    onChange={e => setNisn(e.target.value.replace(/\D/g, ''))}
                    placeholder="0123456789"
                    className="w-full h-12 px-4 border border-neutral-200 rounded-md
                               text-lg font-mono tracking-widest text-center
                               focus:outline-none focus:ring-2 focus:ring-primary-300
                               focus:border-primary-400 transition-all"
                    required
                  />
                  <p className="text-xs text-neutral-400 mt-1.5 text-center">
                    10 digit Nomor Induk Siswa Nasional
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isPending || nisn.length !== 10}
                  className={cn(
                    'w-full h-12 rounded-md font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2',
                    isPending || nisn.length !== 10
                      ? 'bg-neutral-300 cursor-not-allowed'
                      : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] shadow-md hover:shadow-elevated'
                  )}
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memverifikasi...
                    </>
                  ) : 'Masuk'}
                </button>
              </form>
            )}

            {/* Form Staff */}
            {tab === 'staff' && (
              <form onSubmit={handleStaffLogin} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nama@simak.sch.id"
                    className="w-full h-12 px-4 border border-neutral-200 rounded-md
                               focus:outline-none focus:ring-2 focus:ring-primary-300
                               focus:border-primary-400 transition-all"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-neutral-700 mb-1.5">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full h-12 px-4 border border-neutral-200 rounded-md
                               focus:outline-none focus:ring-2 focus:ring-primary-300
                               focus:border-primary-400 transition-all"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isPending}
                  className={cn(
                    'w-full h-12 rounded-md font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2',
                    isPending
                      ? 'bg-neutral-300 cursor-not-allowed'
                      : 'bg-primary-500 hover:bg-primary-600 active:scale-[0.98] shadow-md hover:shadow-elevated'
                  )}
                >
                  {isPending ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Memverifikasi...
                    </>
                  ) : 'Masuk'}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* WhatsApp button */}
        <a
          href={`https://wa.me/${WA_NUMBER}?text=${WA_TEXT}`}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all animate-in"
          style={{ animationDelay: '0.15s' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Hubungi Admin via WhatsApp
        </a>

        {/* Install PWA button — always visible */}
        <button
          onClick={canInstall && deferredPrompt ? handleInstall : undefined}
          className="mt-3 flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white text-sm font-medium px-5 py-2.5 rounded-full transition-all animate-in disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ animationDelay: '0.2s' }}
          disabled={isStandalone || (!canInstall && !isStandalone)}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          {isStandalone ? 'Aplikasi Terinstall' : canInstall ? 'Install Aplikasi' : 'Install Aplikasi'}
        </button>
      </div>

      {/* Footer */}
      <div className="text-center pb-6 px-6 animate-in" style={{ animationDelay: '0.25s' }}>
        <p className="text-primary-300 text-[11px]">Versi 1.0.0</p>
        <p className="text-primary-200 text-[11px] mt-0.5">&copy; SDIT Al-Kautsar Muko-Muko</p>
      </div>
    </div>
  )
}
