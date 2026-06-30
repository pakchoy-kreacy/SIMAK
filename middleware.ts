// ============================================================
// middleware.ts — Proteksi route + session cache via cookie
// ============================================================

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient }        from '@supabase/ssr'
import type { SetAllCookies }        from '@supabase/ssr'

const SESSION_COOKIE = 'simak-session'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Lewati static assets dan API routes
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/icons/') ||
    pathname === '/manifest.json' ||
    pathname === '/sw.js' ||
    pathname === '/favicon.ico'
  ) {
    return NextResponse.next()
  }

  // Login page — redirect jika sudah punya session
  if (pathname === '/login') {
    const parentToken = request.cookies.get('simak_parent_token')?.value
    if (parentToken) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
    return NextResponse.next()
  }

  // Root → login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Routes orang tua
  const parentRoutes = ['/dashboard', '/kalender']
  const isParentRoute = parentRoutes.some(r => pathname.startsWith(r))

  if (isParentRoute) {
    const parentToken = request.cookies.get('simak_parent_token')?.value
    if (!parentToken) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    return NextResponse.next()
  }

  // Routes staff (guru, admin — cek Supabase Auth + set session cookie)
  const staffRoutes = ['/guru', '/admin']
  const isStaffRoute = staffRoutes.some(r => pathname.startsWith(r))

  if (isStaffRoute) {
    const response = NextResponse.next()

    try {
      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() { return request.cookies.getAll() },
            setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
              cookiesToSet.forEach(({ name, value, options }) =>
                response.cookies.set(name, value, options)
              )
            },
          },
        }
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        return NextResponse.redirect(new URL('/login', request.url))
      }

      // Check if session cookie is already valid for this user
      const existingCookie = request.cookies.get(SESSION_COOKIE)?.value
      if (existingCookie) {
        try {
          const parsed = JSON.parse(existingCookie)
          if (parsed.userId === user.id) {
            return response
          }
        } catch {}
      }

      // Fetch profile + roles and store in cookie (one-time per session)
      try {
        const { data: profile } = await supabase
          .from('user_profile')
          .select('nama, role, is_active')
          .eq('id', user.id)
          .single()

        if (profile?.is_active) {
          let allRoles: string[] = [profile.role]

          try {
            const { data: extraRoles } = await supabase
              .from('user_roles')
              .select('role')
              .eq('user_id', user.id)

            if (extraRoles && extraRoles.length > 0) {
              const roleSet = new Set<string>([profile.role])
              for (const r of extraRoles) {
                if (['wali_kelas', 'guru_tahfiz', 'guru_wafa'].includes(r.role)) {
                  roleSet.add(r.role)
                }
              }
              allRoles = Array.from(roleSet)
            }
          } catch {}

          const sessionData = {
            userId: user.id,
            email:  user.email ?? '',
            nama:   profile.nama,
            role:   profile.role,
            roles:  allRoles,
          }

          response.cookies.set(SESSION_COOKIE, JSON.stringify(sessionData), {
            httpOnly: false,
            secure:   process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            path:     '/',
            maxAge:   3600,
          })
        }
      } catch {}
    } catch {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|manifest.json|sw.js).*)',
  ],
}
