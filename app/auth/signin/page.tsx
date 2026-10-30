'use client'

import { createClient } from '@/lib/supabase/client'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense, useState } from 'react'
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react'
import { BrandLogo } from '@/components/branding'


const ERROR_MESSAGES: Record<string, string> = {
  account_lookup_failed: "You're signed in with Google, but we couldn't load your account. The server can't reach the database right now. Please try again in a minute.",
  callback_error: 'Sign-in could not be completed. Please try again.',
  pkce_mismatch: 'Sign-in was started in a different browser or tab. Please click "Continue with Google" again here.',
  missing_code: 'Sign-in was interrupted. Please try again.',
  access_denied: 'Google sign-in was cancelled.',
}

function friendlyError(code: string | null) {
  if (!code) return ''
  return ERROR_MESSAGES[code] || code
}

// Only allow redirects within this site
function safePath(value: string | null) {
  return value && value.startsWith('/') && !value.startsWith('//') ? value : '/dashboard'
}

function AuthContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const redirectTo = safePath(searchParams.get('redirectTo'))
  const initialError = searchParams.get('error')
  
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(friendlyError(initialError))
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  
  // Form fields
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')

  const signInWithGoogle = async () => {
    setLoading(true)
    setError('')

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
        },
      })

      if (error) {
        setError(`Google sign-in is not available yet: ${error.message}`)
      }
    } catch {
      setError('Google sign-in could not start. Please try again or use email sign-in.')
    } finally {
      setLoading(false)
    }
  }

  const signInWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('Please fill in all fields')
      return
    }
    
    setLoading(true)
    setError('')
    const supabase = createClient()
    
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      // Full reload so the server sees the new session cookie
      router.refresh()
      window.location.assign(redirectTo)
    }
  }

  const signUpWithEmail = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || !fullName) {
      setError('Please fill in all fields')
      return
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    
    setLoading(true)
    setError('')
    const supabase = createClient()
    
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setSuccess('Check your email and click the link to confirm your account.')
      setLoading(false)
    }
  }

  const sendSignInLink = async () => {
    if (!email) {
      setError('Enter your email address first, then click "Email me a sign-in link".')
      return
    }
    setLoading(true)
    setError('')
    setSuccess('')
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: false,
        emailRedirectTo: `${window.location.origin}/auth/callback?redirectTo=${encodeURIComponent(redirectTo)}`,
      },
    })
    setLoading(false)
    if (error) setError(error.message)
    else setSuccess(`We sent a sign-in link to ${email}. Open it on this device.`)
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#06121d] px-5 py-10">
      {/* Background effects */}
      <div className="pointer-events-none fixed inset-0 -z-0 overflow-hidden">
        <div className="absolute -left-24 top-24 size-96 rounded-full bg-cyan-400/10 blur-[110px]" />
        <div className="absolute right-0 top-0 size-[34rem] rounded-full bg-indigo-500/15 blur-[140px]" />
        <div className="absolute bottom-0 left-1/2 size-80 rounded-full bg-violet-500/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-md border border-white/15 bg-white/[0.06] backdrop-blur-2xl shadow-2xl shadow-black/30 rounded-3xl p-8">
        {/* Logo & Header */}
        <div className="text-center">
          <BrandLogo alt="Gemini Nexus" className="mx-auto size-16 rounded-2xl object-cover shadow-lg" />
          <h1 className="mt-5 text-2xl font-bold text-white">
            {mode === 'signin' ? 'Welcome back' : 'Create account'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {mode === 'signin' 
              ? 'Sign in to access your workspace' 
              : 'Join Gemini Nexus to get started'}
          </p>
        </div>

        {/* Tab Switch */}
        <div className="mt-6 flex rounded-xl bg-white/5 p-1">
          <button
            onClick={() => { setMode('signin'); setError(''); setSuccess('') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
              mode === 'signin' 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode('signup'); setError(''); setSuccess('') }}
            className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
              mode === 'signup' 
                ? 'bg-cyan-500 text-white shadow-lg' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div role="alert" className="mt-4 rounded-xl bg-rose-500/10 border border-rose-500/20 px-4 py-3 text-sm text-rose-300">
            {error}
          </div>
        )}
        {success && (
          <div className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-3 text-sm text-emerald-300">
            {success}
          </div>
        )}

        {/* Google Sign In */}
        <button
          onClick={signInWithGoogle}
          disabled={loading}
          className="mt-6 flex w-full items-center justify-center gap-3 h-12 rounded-xl bg-white font-semibold text-slate-900 hover:bg-slate-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <svg className="size-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div className="mt-6 flex items-center gap-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-xs text-slate-500 uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email Form */}
        <form onSubmit={mode === 'signin' ? signInWithEmail : signUpWithEmail} className="mt-6 space-y-4">
          {mode === 'signup' && (
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Full name"
                className="w-full h-12 pl-12 pr-4 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition"
              />
            </div>
          )}
          
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
            <input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full h-12 pl-12 pr-4 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition"
            />
          </div>
          
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 size-5 text-slate-500" />
            <input
              type={showPassword ? 'text' : 'password'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-12 pl-12 pr-12 rounded-xl border border-white/10 bg-white/5 text-white placeholder:text-slate-500 outline-none focus:border-cyan-500/50 focus:bg-white/10 transition"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition"
            >
              {showPassword ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
            </button>
          </div>

          {mode === 'signin' && (
            <div className="flex justify-end">
              <button type="button" onClick={sendSignInLink} disabled={loading} className="text-xs text-cyan-400 hover:underline disabled:opacity-50">
                Forgot password? Email me a sign-in link
              </button>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 font-semibold text-white hover:from-cyan-400 hover:to-blue-500 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="size-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                {mode === 'signin' ? 'Sign In' : 'Create Account'}
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="mt-6 text-center text-xs text-slate-500">
          {mode === 'signin' ? (
            <>Staff accounts only. Clients don&apos;t need to sign in.</>
          ) : (
            <>By signing up, you agree to our terms of service.</>
          )}
        </p>

        <a href="/" className="mt-4 flex items-center justify-center gap-1 text-xs text-cyan-300 hover:underline">
          ← Back to main site
        </a>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center bg-[#06121d]">
        <div className="size-8 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin" />
      </main>
    }>
      <AuthContent />
    </Suspense>
  )
}
