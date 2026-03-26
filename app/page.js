'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
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
  const [loading, setLoading] = useState(true)

  // ✅ MAIN LOAD
  useEffect(() => {
    let mounted = true

    const load = async () => {
      setLoading(true)

      const { data: { session } } = await supabase.auth.getSession()

      // ❗ wait for session (DO NOT redirect immediately)
      if (!session) {
        setLoading(false)
        return
      }

      const authUser = session.user

      if (!mounted) return

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

      setScores(sc ?? [])
      setWinnings(wins ?? [])

      setLoading(false)
    }

    load()

    return () => { mounted = false }
  }, [])

  // ✅ LISTENER (IMPORTANT)
  useEffect(() => {
    const { data: listener } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_OUT') {
          router.push('/login')
        }
      }
    )

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    )
  }

  const active = isSubscriptionActive(profile)
  const totalWon = winnings.reduce((s, w) => s + parseFloat(w.amount), 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />

      <main className="ml-60 flex-1 p-8">
        <h1 className="text-3xl font-bold mb-6">
          Hey {profile?.full_name || 'User'} 👋
        </h1>

        {!active && (
          <div className="mb-6 p-4 bg-yellow-200">
            Activate subscription to continue
          </div>
        )}

        <div className="grid grid-cols-4 gap-4 mb-6">
          <div>
            <p>Status</p>
            <span>{profile?.subscription_status}</span>
          </div>

          <div>
            <p>Scores</p>
            <p>{scores.length}/5</p>
          </div>

          <div>
            <p>Total Won</p>
            <p>{formatCurrency(totalWon)}</p>
          </div>

          <div>
            <p>Charity</p>
            <p>{profile?.charity_percentage || 10}%</p>
          </div>
        </div>

        <h2 className="text-xl mb-2">Recent Scores</h2>
        {scores.map(s => (
          <div key={s.id}>
            {formatDate(s.played_date)} - {s.score}
          </div>
        ))}

        <h2 className="text-xl mt-6 mb-2">Winnings</h2>
        {winnings.map(w => (
          <div key={w.id}>
            {w.draws?.month} - {formatCurrency(w.amount)}
          </div>
        ))}
      </main>
    </div>
  )
}