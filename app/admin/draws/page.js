'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { formatCurrency, formatDate, getCurrentMonth } from '@/lib/utils'

export default function AdminDrawsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [simulation, setSimulation] = useState(null)
  const [useAlgorithm, setUseAlgorithm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchDraws = async () => {
    const { data } = await supabase
      .from('draws').select('*').order('created_at', { ascending: false })
    setDraws(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)
      await fetchDraws()
      setLoading(false)
    }
    init()
  }, [])

  const handleSimulate = async () => {
    setRunning(true)
    setError('')
    const res = await fetch('/api/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'simulate', useAlgorithm }),
    })
    const data = await res.json()
    if (data.success) setSimulation(data.simulation)
    else setError(data.error)
    setRunning(false)
  }

  const handleRunDraw = async () => {
    if (!confirm('Run the official draw for this month? This cannot be undone.')) return
    setRunning(true)
    setError('')
    setSuccess('')
    const res = await fetch('/api/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'run', month: getCurrentMonth(), useAlgorithm }),
    })
    const data = await res.json()
    if (data.success) {
      setSuccess('Draw completed! Review results and publish when ready.')
      await fetchDraws()
    } else {
      setError(data.error)
    }
    setRunning(false)
  }

  const handlePublish = async (drawId) => {
    const res = await fetch('/api/draw', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'publish', drawId }),
    })
    const data = await res.json()
    if (data.success) { await fetchDraws() }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} isAdmin />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Draw Management</h1>
        <p className="text-white/40 text-sm mb-8">Configure, simulate, and run monthly draws.</p>

        {/* Draw controls */}
        <div className="card mb-8">
          <h2 className="font-display font-bold text-lg mb-5">Run a draw</h2>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-4">{error}</div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-4">✓ {success}</div>
          )}

          {/* Algorithm toggle */}
          <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-white/5 border border-white/5">
            <div className="flex-1">
              <p className="font-semibold text-sm mb-1">Draw mode</p>
              <p className="text-white/40 text-xs">
                {useAlgorithm
                  ? 'Algorithmic: weighted toward least-frequent user scores'
                  : 'Random: standard lottery-style, all numbers equally likely'}
              </p>
            </div>
            <button onClick={() => setUseAlgorithm(!useAlgorithm)}
              className={`relative w-12 h-6 rounded-full transition-colors ${useAlgorithm ? 'bg-[#b8f57a]' : 'bg-white/10'}`}>
              <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${useAlgorithm ? 'left-7' : 'left-1'}`} />
            </button>
            <span className="text-sm text-white/60">{useAlgorithm ? 'Algorithmic' : 'Random'}</span>
          </div>

          <div className="flex gap-3">
            <button onClick={handleSimulate} disabled={running} className="btn-secondary">
              {running ? '…' : '🔍 Simulate (preview)'}
            </button>
            <button onClick={handleRunDraw} disabled={running} className="btn-primary">
              {running ? 'Running…' : '🎲 Run official draw'}
            </button>
          </div>
        </div>

        {/* Simulation result */}
        {simulation && (
          <div className="card mb-8 border-[#b8f57a]/20">
            <h2 className="font-display font-bold text-lg mb-2">Simulation result</h2>
            <p className="text-white/40 text-xs mb-4">This is a preview — no data was saved.</p>

            <div className="flex gap-2 mb-4">
              {simulation.drawNumbers.map(n => (
                <div key={n} className="draw-ball">{n}</div>
              ))}
            </div>

            <p className="text-sm text-white/60 mb-3">
              Prize pool: <span className="text-[#b8f57a] font-semibold">{formatCurrency(simulation.totalPool)}</span>
              &nbsp;·&nbsp; Potential winners: <span className="text-white">{simulation.results.length}</span>
            </p>

            {simulation.results.length > 0 ? (
              <div className="space-y-2">
                {simulation.results.map(r => (
                  <div key={r.userId} className="flex items-center justify-between text-sm py-2 border-b border-white/5">
                    <span className="text-white/60">{r.email}</span>
                    <span className="text-[#b8f57a]">{r.matches} matches</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-white/30 text-sm">No users would win with these numbers.</p>
            )}
          </div>
        )}

        {/* Draw history */}
        <div className="card">
          <h2 className="font-display font-bold text-lg mb-5">Draw history</h2>
          {draws.length === 0 ? (
            <p className="text-white/30 text-sm">No draws run yet.</p>
          ) : (
            <div className="space-y-4">
              {draws.map(draw => (
                <div key={draw.id}
                  className="p-4 rounded-xl bg-white/5 border border-white/5 flex items-center justify-between gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <p className="font-display font-bold">{draw.month}</p>
                      <span className={`badge text-xs ${draw.is_published ? 'bg-emerald-400/10 text-emerald-400' : 'bg-amber-400/10 text-amber-400'}`}>
                        {draw.is_published ? 'Published' : 'Draft'}
                      </span>
                      {draw.jackpot_rollover && (
                        <span className="badge text-xs bg-red-400/10 text-red-400">Jackpot rolled</span>
                      )}
                    </div>
                    <div className="flex gap-1.5 mb-1">
                      {draw.draw_numbers?.map(n => (
                        <div key={n} className="draw-ball w-8 h-8 text-xs">{n}</div>
                      ))}
                    </div>
                    <p className="text-white/40 text-xs mt-2">
                      Pool: {formatCurrency(draw.total_prize_pool)} · {formatDate(draw.created_at)}
                    </p>
                  </div>

                  {!draw.is_published && (
                    <button onClick={() => handlePublish(draw.id)} className="btn-primary text-xs py-2 shrink-0">
                      Publish results
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
