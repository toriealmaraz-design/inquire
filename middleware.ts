import { updateSession } from '@/lib/supabase/middleware'
import { type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

// Only run the session refresh where auth matters. Public pages (/, /chat,
// /auth/signin, /workflow, public APIs) skip the Supabase round-trip entirely.
export const config = {
  matcher: ['/dashboard/:path*', '/onboarding/:path*', '/help/:path*', '/agent/:path*', '/admin/:path*', '/api/admin/:path*'],
}
