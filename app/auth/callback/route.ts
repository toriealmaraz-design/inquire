import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

function getSafeRedirect(path: string | null) {
  if (!path || !path.startsWith('/') || path.startsWith('//')) return '/dashboard'
  return path
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const redirectTo = getSafeRedirect(requestUrl.searchParams.get('redirectTo'))
  const providerError = requestUrl.searchParams.get('error_description') || requestUrl.searchParams.get('error')

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      return NextResponse.redirect(new URL(redirectTo, requestUrl.origin))
    }
  }

  const signInUrl = new URL('/auth/signin', requestUrl.origin)
  signInUrl.searchParams.set('error', providerError || 'callback_error')
  signInUrl.searchParams.set('redirectTo', redirectTo)
  return NextResponse.redirect(signInUrl)
}
