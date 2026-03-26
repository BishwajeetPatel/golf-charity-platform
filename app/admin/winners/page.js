'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { formatCurrency, formatDate, getMatchLabel, statusColor } from '@/lib/utils'

export default function AdminWinnersPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [winnings, setWinnings] = useState([])
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  const fetchWinnings = async () => {
    const { data } = await supabase
      .from('winnings')
      .select('*, users(email, full_name), draws(month, draw_numbers)')
      .order('created_at', { ascending: false })
    setWinnings(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)
      await fetchWinnings()
      setLoading(false)
    }
    init()
  }, [])

  const updateStatus = async (id, status) => {
    await supabase.from('winnings').update({ status }).eq('id', id)
    await fetchWinnings()
  }

  const filtered = filter === 'all' ? winnings : winnings.filter(w => w.status === filter)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} isAdmin />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Winners</h1>
        <p className="text-white/40 text-sm mb-8">Verify submissions and manage payouts.</p>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6">
          {['all', 'pending', 'verified', 'paid', 'rejected'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`text-xs px-3 py-1.5 rounded-lg capitalize transition-colors
                ${filter === f ? 'bg-[#b8f57a] text-[#0a0a0f] font-semibold' : 'bg-white/5 text-white/50 hover:bg-white/10'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* Winners table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Winner', 'Draw', 'Match', 'Amount', 'Status', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs text-white/30 px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(w => (
                  <tr key={w.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="font-medium">{w.users?.full_name ?? '—'}</p>
                      <p className="text-white/40 text-xs">{w.users?.email}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-white/60">{w.draws?.month}</p>
                      <div className="flex gap-1 mt-1">
                        {w.draws?.draw_numbers?.map(n => (
                          <span key={n} className="text-[10px] text-[#b8f57a] bg-[#b8f57a]/10 rounded px-1">{n}</span>
                        ))}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-sm">{getMatchLabel(w.match_type)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="font-display font-bold text-[#b8f57a]">{formatCurrency(w.amount)}</span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`badge text-xs ${statusColor(w.status)}`}>{w.status}</span>
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex gap-2">
                        {w.status === 'pending' && (
                          <>
                            <button onClick={() => updateStatus(w.id, 'verified')}
                              className="text-xs text-emerald-400 hover:underline">Verify</button>
                            <button onClick={() => updateStatus(w.id, 'rejected')}
                              className="text-xs text-red-400 hover:underline">Reject</button>
                          </>
                        )}
                        {w.status === 'verified' && (
                          <button onClick={() => updateStatus(w.id, 'paid')}
                            className="text-xs text-[#b8f57a] hover:underline">Mark paid</button>
                        )}
                        {(w.status === 'paid' || w.status === 'rejected') && (
                          <span className="text-xs text-white/20">—</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-white/30 text-sm py-10">No records found.</p>
          )}
        </div>
      </main>
    </div>
  )
}
