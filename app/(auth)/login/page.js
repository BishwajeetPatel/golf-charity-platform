'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { data, error: authErr } = await supabase.auth.signInWithPassword({
      email: form.email,
      password: form.password,
    })

    if (authErr) {
      setError(authErr.message)
      setLoading(false)
      return
    }

    // ✅ ensure session exists
    const { data: sessionData } = await supabase.auth.getSession()

    if (!sessionData.session) {
      setError('Login failed. Try again.')
      setLoading(false)
      return
    }

    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center text-2xl mb-10">
          GolfDraw
        </Link>

        <div className="card">
          <h1 className="text-2xl font-bold mb-1">Welcome back</h1>

          {error && <p className="text-red-400">{error}</p>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
              className="input"
              required
            />

            <input
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
              className="input"
              required
            />

            <button className="btn-primary w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6">
          Don't have an account? <Link href="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  )
}