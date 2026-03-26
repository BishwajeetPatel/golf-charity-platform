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
    const load = async () => {
      try {
        // ✅ FIXED: use getSession instead of getUser
        const { data: { session } } = await supabase.auth.getSession()
        const authUser = session?.user

        if (!authUser) {
          router.push('/login')
          return
        }

        // ✅ Get profile
        const prof = await getUserProfile(authUser.id)
        if (!prof) {
          router.push('/login')
          return
        }

        if (prof.role === 'admin') {
          router.push('/admin')
          return
        }

        setUser(authUser)
        setProfile(prof)

        // ✅ Get scores
        const { data: sc } = await supabase
          .from('scores')
          .select('*')
          .eq('user_id', authUser.id)
          .order('played_date', { ascending: false })
          .limit(5)

        setScores(sc ?? [])

        // ✅ Get winnings
        const { data: wins } = await supabase
          .from('winnings')
          .select('*, draws(month, draw_numbers)')
          .eq('user_id', authUser.id)
          .order('created_at', { ascending: false })
          .limit(5)

        setWinnings(wins ?? [])

      } catch (err) {
        console.error('Dashboard error:', err)
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  // ✅ Subscribe handler
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

  // ✅ Loading screen
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

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">
            Hey, {profile?.full_name?.split(' ')[0] ?? 'Golfer'} 👋
          </h1>
          <p className="text-white/40 text-sm mt-1">
            Here's what's happening with your account.
          </p>
        </div>

        {/* Subscription warning */}
        {!active && (
          <div className="rounded-2xl border border-[#f5c87a]/20 bg-[#f5c87a]/5 p-6 mb-8">
            <div className="flex justify-between">
              <div>
                <p className="font-bold text-[#f5c87a] mb-1">
                  Activate your subscription
                </p>
                <p className="text-white/50 text-sm">
                  Required to log scores and join draws
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleSubscribe('monthly')}
                  className="btn-primary"
                  disabled={subscribing}
                >
                  £9.99/mo
                </button>

                <button
                  onClick={() => handleSubscribe('yearly')}
                  className="btn-secondary"
                  disabled={subscribing}
                >
                  £99.99/yr
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          <div className="card">
            <p className="text-xs text-white/40 mb-2">Subscription</p>
            <span className={`badge ${statusColor(profile?.subscription_status)}`}>
              {profile?.subscription_status ?? 'inactive'}
            </span>
            {active && (
              <p className="text-white/30 text-xs mt-2">
                {daysRemaining(profile)} days left
              </p>
            )}
          </div>

          <div className="card">
            <p className="text-xs text-white/40 mb-2">Scores</p>
            <p className="text-2xl font-bold">{scores.length}/5</p>
          </div>

          <div className="card">
            <p className="text-xs text-white/40 mb-2">Total Won</p>
            <p className="text-2xl font-bold">
              {formatCurrency(totalWon)}
            </p>
          </div>

          <div className="card">
            <p className="text-xs text-white/40 mb-2">Charity</p>
            <p className="text-2xl font-bold text-[#7af5c8]">
              {profile?.charity_percentage ?? 10}%
            </p>
          </div>

        </div>

        {/* Scores + Winnings */}
        <div className="grid md:grid-cols-2 gap-6">

          {/* Scores */}
          <div className="card">
            <div className="flex justify-between mb-4">
              <h2>Recent Scores</h2>
              <Link href="/dashboard/scores">Manage →</Link>
            </div>

            {scores.length === 0 ? (
              <p>No scores yet</p>
            ) : (
              scores.map(s => (
                <div key={s.id} className="flex justify-between py-2">
                  <span>{formatDate(s.played_date)}</span>
                  <span>{s.score}</span>
                </div>
              ))
            )}
          </div>

          {/* Winnings */}
          <div className="card">
            <div className="flex justify-between mb-4">
              <h2>Winnings</h2>
              <Link href="/dashboard/winnings">View →</Link>
            </div>

            {winnings.length === 0 ? (
              <p>No winnings yet</p>
            ) : (
              winnings.map(w => (
                <div key={w.id} className="flex justify-between py-2">
                  <span>{w.draws?.month}</span>
                  <span>{formatCurrency(w.amount)}</span>
                </div>
              ))
            )}
          </div>

        </div>

      </main>
    </div>
  )
}