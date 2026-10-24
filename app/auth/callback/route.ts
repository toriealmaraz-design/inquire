import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

// Only allow redirects to paths on this site (blocks "//evil.com" style open redirects)
function safePath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') && !value.startsWith('/\\') ? value : '/dashboard'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const { searchParams } = requestUrl
  const code = searchParams.get('code')
  const redirectTo = safePath(searchParams.get('redirectTo'))
  const providerError = searchParams.get('error_description') || searchParams.get('error')

  const fail = (reason: string) => {
    const url = new URL('/auth/signin', requestUrl.origin)
    url.searchParams.set('error', reason)
    if (redirectTo !== '/dashboard') url.searchParams.set('redirectTo', redirectTo)
    return NextResponse.redirect(url)
  }

  if (providerError) return fail(providerError.slice(0, 200))
  if (!code) return fail('missing_code')

  const supabase = await createClient()
  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error('OAuth code exchange failed:', error.message)
    return fail(/code verifier|pkce/i.test(error.message) ? 'pkce_mismatch' : 'callback_error')
  }

  const forwardedHost = request.headers.get('x-forwarded-host')
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https'
  const appOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin

  return NextResponse.redirect(new URL(redirectTo, appOrigin))
}
