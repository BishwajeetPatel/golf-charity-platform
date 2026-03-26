'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { formatCurrency, formatDate, getMatchLabel, statusColor } from '@/lib/utils'

export default function WinningsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [winnings, setWinnings] = useState([])
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof) { router.push('/login'); return }
      setUser(u)

      const [{ data: wins }, { data: publishedDraws }] = await Promise.all([
        supabase.from('winnings')
          .select('*, draws(month, draw_numbers, total_prize_pool)')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false }),
        supabase.from('draws').select('*').eq('is_published', true).order('created_at', { ascending: false }).limit(6),
      ])

      setWinnings(wins ?? [])
      setDraws(publishedDraws ?? [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  const totalWon = winnings.reduce((s, w) => s + parseFloat(w.amount), 0)
  const totalPaid = winnings.filter(w => w.status === 'paid').reduce((s, w) => s + parseFloat(w.amount), 0)

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Winnings</h1>
        <p className="text-white/40 text-sm mb-8">Your draw results and prize history.</p>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8 stagger">
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Total won</p>
            <p className="font-display text-3xl font-bold grad-text">{formatCurrency(totalWon)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Paid out</p>
            <p className="font-display text-3xl font-bold text-emerald-400">{formatCurrency(totalPaid)}</p>
          </div>
          <div className="card">
            <p className="text-xs text-white/40 mb-2">Draws entered</p>
            <p className="font-display text-3xl font-bold">{draws.length}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Winning records */}
          <div className="card">
            <h2 className="font-display font-bold text-lg mb-5">Prize history</h2>
            {winnings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🎲</p>
                <p className="text-white/30 text-sm">No winnings yet — keep logging scores!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {winnings.map(w => (
                  <div key={w.id}
                    className="p-4 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold text-sm">{getMatchLabel(w.match_type)}</p>
                        <p className="text-white/40 text-xs">{w.draws?.month}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-display font-bold text-[#b8f57a]">{formatCurrency(w.amount)}</p>
                        <span className={`badge text-xs ${statusColor(w.status)}`}>{w.status}</span>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {w.draws?.draw_numbers?.map(n => (
                        <div key={n} className="draw-ball w-7 h-7 text-xs">{n}</div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent draws */}
          <div className="card">
            <h2 className="font-display font-bold text-lg mb-5">Recent draws</h2>
            {draws.length === 0 ? (
              <p className="text-white/30 text-sm">No published draws yet.</p>
            ) : (
              <div className="space-y-3">
                {draws.map(d => {
                  const userWon = winnings.find(w => w.draw_id === d.id)
                  return (
                    <div key={d.id}
                      className={`p-4 rounded-xl border ${userWon ? 'border-[#b8f57a]/20 bg-[#b8f57a]/5' : 'border-white/5 bg-white/5'}`}>
                      <div className="flex items-center justify-between mb-2">
                        <p className="font-semibold text-sm">{d.month}</p>
                        {userWon
                          ? <span className="text-[#b8f57a] text-xs font-semibold">You won! {formatCurrency(userWon.amount)}</span>
                          : <span className="text-white/30 text-xs">No match</span>
                        }
                      </div>
                      <div className="flex gap-1">
                        {d.draw_numbers?.map(n => (
                          <div key={n} className="draw-ball w-7 h-7 text-xs">{n}</div>
                        ))}
                      </div>
                      <p className="text-white/30 text-xs mt-2">Pool: {formatCurrency(d.total_prize_pool)}</p>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
