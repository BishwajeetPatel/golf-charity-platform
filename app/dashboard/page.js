'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { isSubscriptionActive, daysRemaining } from '@/lib/subscriptionLogic'
import { formatCurrency, formatDate, statusColor } from '@/lib/utils'

export default function DashboardPage() {
  const router = useRouter()

  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [winnings, setWinnings] = useState([])
  const [nextDraw, setNextDraw] = useState(null)
  const [totalDrawsEntered, setTotalDrawsEntered] = useState(0)
  const [loading, setLoading] = useState(true)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => {
    let mounted = true

    const load = async () => {
      const { data: { user: authUser }, error: userError } = await supabase.auth.getUser()

      if (!mounted) return
      if (userError || !authUser) { router.push('/login'); return }

      const prof = await getUserProfile(authUser.id)
      if (!mounted) return

      if (!prof) {
        setUser(authUser)
        setLoading(false)
        return
      }

      if (prof.role === 'admin') { router.push('/admin'); return }

      setUser(authUser)
      setProfile(prof)

      const [
        { data: sc },
        { data: wins },
        { data: drawsData },
        { count: drawsEntered },
      ] = await Promise.all([
        supabase.from('scores').select('*').eq('user_id', authUser.id)
          .order('played_date', { ascending: false }).limit(5),
        supabase.from('winnings').select('*, draws(month, draw_numbers)')
          .eq('user_id', authUser.id).order('created_at', { ascending: false }).limit(5),
        supabase.from('draws').select('month, created_at').eq('is_published', true)
          .order('created_at', { ascending: false }).limit(1),
        supabase.from('draws').select('*', { count: 'exact', head: true }).eq('is_published', true),
      ])

      if (!mounted) return

      setScores(sc ?? [])
      setWinnings(wins ?? [])
      setTotalDrawsEntered(drawsEntered ?? 0)

      // Calculate next draw date (1st of next month)
      const now = new Date()
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
      setNextDraw(nextMonth)

      setLoading(false)
    }

    load()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') router.push('/login')
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  const active = isSubscriptionActive(profile)
  const totalWon = winnings.reduce((s, w) => s + parseFloat(w.amount), 0)
  const pendingWins = winnings.filter(w => w.status === 'pending').length

  // Days until next draw
  const daysToNextDraw = nextDraw
    ? Math.ceil((nextDraw - new Date()) / (1000 * 60 * 60 * 24))
    : null

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

        {/* Subscription activation banner */}
        {!active && (
          <div className="rounded-2xl border border-[#f5c87a]/20 bg-[#f5c87a]/5 p-6 mb-8">
            <div className="flex justify-between items-start">
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

        {/* Pending verification alert */}
        {pendingWins > 0 && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>🏆</span>
              <p className="text-sm text-amber-400 font-semibold">
                You have {pendingWins} prize{pendingWins > 1 ? 's' : ''} awaiting verification — upload your proof to get paid!
              </p>
            </div>
            <Link href="/dashboard/winnings" className="text-xs text-amber-400 hover:underline shrink-0">Upload proof →</Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
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
            <p className="text-xs text-white/40 mb-2">My Scores</p>
            <p className="text-2xl font-bold">{scores.length}<span className="text-white/30 text-base">/5</span></p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Total Won</p>
            <p className="text-2xl font-bold grad-text">{formatCurrency(totalWon)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Charity</p>
            <p className="text-2xl font-bold text-[#7af5c8]">{profile?.charity_percentage ?? 10}%</p>
          </div>
        </div>

        {/* Participation summary */}
        <div className="card mb-6 border-[#b8f57a]/10 bg-gradient-to-r from-[#b8f57a]/5 to-transparent">
          <h2 className="font-display font-bold mb-4">🎲 Draw Participation</h2>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-white/40 mb-1">Draws entered</p>
              <p className="font-display text-2xl font-bold text-[#b8f57a]">{totalDrawsEntered}</p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Next draw in</p>
              <p className="font-display text-2xl font-bold">
                {daysToNextDraw !== null ? `${daysToNextDraw}d` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-white/40 mb-1">Your numbers</p>
              <div className="flex gap-1 mt-1">
                {scores.length > 0
                  ? scores.map(s => <div key={s.id} className="draw-ball w-8 h-8 text-xs">{s.score}</div>)
                  : <span className="text-white/30 text-sm">No scores yet</span>
                }
              </div>
            </div>
          </div>
          {active && scores.length < 5 && (
            <p className="text-amber-400/70 text-xs mt-4">
              ⚠ Add {5 - scores.length} more score{5 - scores.length > 1 ? 's' : ''} to maximise your draw entries.
            </p>
          )}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Recent Scores */}
          <div className="card">
            <div className="flex justify-between mb-4">
              <h2 className="font-display font-bold">Recent Scores</h2>
              <Link href="/dashboard/scores" className="text-xs text-[#b8f57a] hover:underline">Manage →</Link>
            </div>
            {scores.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">⛳</p>
                <p className="text-white/30 text-sm mb-3">No scores yet.</p>
                {active && (
                  <Link href="/dashboard/scores" className="btn-primary text-xs py-2 px-4">Add your first score</Link>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {scores.map(s => (
                  <div key={s.id} className="flex justify-between py-2 border-b border-white/5 last:border-0 text-sm">
                    <span className="text-white/60">{formatDate(s.played_date)}</span>
                    <div className="draw-ball w-8 h-8 text-xs">{s.score}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Winnings */}
          <div className="card">
            <div className="flex justify-between mb-4">
              <h2 className="font-display font-bold">Winnings</h2>
              <Link href="/dashboard/winnings" className="text-xs text-[#b8f57a] hover:underline">View all →</Link>
            </div>
            {winnings.length === 0 ? (
              <div className="text-center py-6">
                <p className="text-3xl mb-2">🏆</p>
                <p className="text-white/30 text-sm">No winnings yet. Keep playing!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {winnings.map(w => (
                  <div key={w.id} className="flex justify-between items-center py-2 border-b border-white/5 last:border-0 text-sm">
                    <div>
                      <span className="text-white/60">{w.draws?.month}</span>
                      {w.status === 'pending' && (
                        <span className="ml-2 text-[10px] text-amber-400 bg-amber-400/10 rounded px-1.5 py-0.5">needs proof</span>
                      )}
                    </div>
                    <span className="font-bold text-[#b8f57a]">{formatCurrency(w.amount)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Charity impact */}
        {profile?.charities && (
          <div className="mt-6 card border-[#7af5c8]/15 bg-[#7af5c8]/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-[#7af5c8]/20 flex items-center justify-center text-[#7af5c8]">❤</div>
                <div>
                  <p className="font-semibold text-sm">{profile.charities.name}</p>
                  <p className="text-white/40 text-xs">
                    You're contributing {profile.charity_percentage}% of your subscription
                  </p>
                </div>
              </div>
              <Link href="/dashboard/charity" className="text-xs text-[#7af5c8] hover:underline">Change →</Link>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}