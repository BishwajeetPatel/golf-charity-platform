'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import {
  isSubscriptionActive,
  daysRemaining
} from '@/lib/subscriptionLogic'
import {
  formatCurrency,
  formatDate,
  statusColor
} from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [winnings, setWinnings] = useState([])
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      // Use getUser() — makes a verified server-round-trip, more reliable than getSession()
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (!mounted) return

      if (userError || !authUser) {
        router.push('/login')
        return
      }

      const prof = await getUserProfile(authUser.id)

      if (!mounted) return

      if (!prof) {
        // Profile row missing — don't redirect to login, just show empty state
        setUser(authUser)
        setLoading(false)
        return
      }

      if (prof.role === 'admin') {
        router.push('/admin')
        return
      }

      setUser(authUser)
      setProfile(prof)

      const { data: sc } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', authUser.id)
        .order('played_date', { ascending: false })
        .limit(5)

      const { data: wins } = await supabase
        .from('winnings')
        .select('*, draws(month, draw_numbers)')
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false })
        .limit(5)

      if (!mounted) return

      setScores(sc ?? [])
      setWinnings(wins ?? [])
      setLoading(false)
    }

    load()

    // Listen for sign-out only — don't re-run the whole load on every auth event
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        router.push('/login')
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, []) // ← empty deps, runs once on mount only

  const handleSubscribe = async (plan) => {
    setSubscribing(true)
    try {
      const res = await fetch('/api/subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'activate', planType: plan }),
      })
      const data = await res.json()
      if (data.success) {
        const prof = await getUserProfile(user.id)
        setProfile(prof)
      }
    } catch (err) {
      console.error(err)
    }
    setSubscribing(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
      </div>
    )
  }

  const active = isSubscriptionActive(profile)
  const totalWon = winnings.reduce((s, w) => s + parseFloat(w.amount), 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />

      <main className="ml-60 flex-1 p-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Golfer'} 👋
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Here's what's happening with your account.
          </p>
        </div>

        {!active && (
          <div className="rounded-2xl border border-[#f5c87a]/20 bg-[#f5c87a]/5 p-6 mb-8">
            <div className="flex justify-between">
              <div>
                <p className="font-bold text-[#f5c87a] mb-1">Activate your subscription</p>
                <p className="text-white/50 text-sm">Required to log scores and join draws</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => handleSubscribe('monthly')} className="btn-primary" disabled={subscribing}>
                  £9.99/mo
                </button>
                <button onClick={() => handleSubscribe('yearly')} className="btn-secondary" disabled={subscribing}>
                  £99.99/yr
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Subscription</p>
            <span className={`badge ${statusColor(profile?.subscription_status)}`}>
              {profile?.subscription_status ?? 'inactive'}
            </span>
            {active && (
              <p className="text-white/30 text-xs mt-2">{daysRemaining(profile)} days left</p>
            )}
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Scores</p>
            <p className="text-2xl font-bold">{scores.length}/5</p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Total Won</p>
            <p className="text-2xl font-bold">{formatCurrency(totalWon)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Charity</p>
            <p className="text-2xl font-bold text-[#7af5c8]">{profile?.charity_percentage ?? 10}%</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="card">
            <div className="flex justify-between mb-4">
              <h2 className="font-display font-bold">Recent Scores</h2>
              <Link href="/dashboard/scores" className="text-xs text-[#b8f57a] hover:underline">Manage →</Link>
            </div>
            {scores.length === 0 ? (
              <p className="text-white/30 text-sm">No scores yet.</p>
            ) : (
              <div className="space-y-2">
                {scores.map(s => (
                  <div key={s.id} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                    <span className="text-white/60">{formatDate(s.played_date)}</span>
                    <span className="font-bold">{s.score}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="card">
            <div className="flex justify-between mb-4">
              <h2 className="font-display font-bold">Winnings</h2>
              <Link href="/dashboard/winnings" className="text-xs text-[#b8f57a] hover:underline">View →</Link>
            </div>
            {winnings.length === 0 ? (
              <p className="text-white/30 text-sm">No winnings yet.</p>
            ) : (
              <div className="space-y-2">
                {winnings.map(w => (
                  <div key={w.id} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                    <span className="text-white/60">{w.draws?.month}</span>
                    <span className="font-bold text-[#b8f57a]">{formatCurrency(w.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}