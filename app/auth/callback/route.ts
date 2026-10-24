import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow redirects to paths on this site (blocks "//evil.com" style open redirects)
function safePath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/dashboard'
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const redirectTo = safePath(searchParams.get('redirectTo'))

  const fail = (reason: string) => {
    const url = new URL('/auth/signin', origin)
    url.searchParams.set('error', reason)
    if (redirectTo !== '/dashboard') url.searchParams.set('redirectTo', redirectTo)
    return NextResponse.redirect(url)
  }

  // Google / Supabase sent an error back (e.g. user cancelled, provider misconfigured)
  const providerError = searchParams.get('error_description') || searchParams.get('error')
  if (providerError) return fail(providerError.slice(0, 200))

  if (!code) return fail('missing_code')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)
  if (error) {
    console.error('OAuth code exchange failed:', error.message)
    return fail(/code verifier|pkce/i.test(error.message) ? 'pkce_mismatch' : 'callback_error')
  }

  return NextResponse.redirect(`${origin}${redirectTo}`)
}
