'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { validateScore, deleteScore } from '@/lib/scoreLogic'
import { formatDate } from '@/lib/utils'

export default function ScoresPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [scores, setScores] = useState([])
  const [form, setForm] = useState({ score: '', played_date: '' })
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  const loadScores = async (userId) => {
    const { data } = await supabase
      .from('scores').select('*').eq('user_id', userId)
      .order('played_date', { ascending: false }).limit(5)
    setScores(data ?? [])
  }

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { user: u }, error: userError } = await supabase.auth.getUser()
      if (!mounted) return
      if (userError || !u) { router.push('/login'); return }

      // Fetch profile — but don't redirect if it's briefly null
      const { data: prof } = await supabase
        .from('users')
        .select('*, charities(*)')
        .eq('id', u.id)
        .single()

      if (!mounted) return
      setUser(u)
      setProfile(prof ?? null)
      await loadScores(u.id)
      setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleAdd = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    const validationError = validateScore(form.score)
    if (validationError) { setError(validationError); return }
    if (!form.played_date) { setError('Please select a date.'); return }

    if (profile?.subscription_status !== 'active') {
      setError('You need an active subscription to log scores.')
      return
    }

    setSubmitting(true)
    const res = await fetch('/api/scores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ score: form.score, played_date: form.played_date }),
    })
    const data = await res.json()

    if (!data.success) {
      setError(data.error ?? 'Failed to add score.')
    } else {
      setSuccess('Score added!')
      setForm({ score: '', played_date: '' })
      await loadScores(user.id)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    await deleteScore(id)
    await loadScores(user.id)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="ml-60 flex-1 p-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2">My Scores</h1>
        <p className="text-white/40 text-sm mb-8">
          Enter your Stableford scores (1–45). Only your last 5 scores are kept — they become your draw entries.
        </p>

        <div className="card mb-8">
          <h2 className="font-display font-bold text-lg mb-5">Add a score</h2>

          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-4">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-4">
              ✓ {success}
            </div>
          )}

          <form onSubmit={handleAdd} className="flex gap-4 items-end">
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1.5 block">Stableford score (1–45)</label>
              <input type="number" className="input" min="1" max="45"
                placeholder="e.g. 32"
                value={form.score}
                onChange={e => setForm(p => ({ ...p, score: e.target.value }))} />
            </div>
            <div className="flex-1">
              <label className="text-xs text-white/40 mb-1.5 block">Date played</label>
              <input type="date" className="input"
                value={form.played_date}
                max={new Date().toISOString().split('T')[0]}
                onChange={e => setForm(p => ({ ...p, played_date: e.target.value }))} />
            </div>
            <button type="submit" disabled={submitting} className="btn-primary shrink-0">
              {submitting ? '…' : '+ Add'}
            </button>
          </form>

          {scores.length >= 5 && (
            <p className="text-amber-400/70 text-xs mt-3">
              ⚠ You have 5 scores — adding a new one will remove the oldest.
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="font-display font-bold text-lg mb-5">
            Your scores <span className="text-white/30 font-normal text-base">({scores.length}/5)</span>
          </h2>

          {scores.length === 0 ? (
            <p className="text-white/30">No scores yet. Add your first round above.</p>
          ) : (
            <div className="space-y-3">
              {scores.map((s, i) => (
                <div key={s.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <span className="text-white/20 text-xs font-display">#{i + 1}</span>
                    <div className="draw-ball">{s.score}</div>
                    <div>
                      <p className="text-sm font-semibold">Score: {s.score}</p>
                      <p className="text-white/30 text-xs">{formatDate(s.played_date)}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDelete(s.id)}
                    className="text-white/20 hover:text-red-400 transition-colors text-sm">
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl border border-[#b8f57a]/10 bg-[#b8f57a]/5 p-5">
          <p className="text-[#b8f57a] text-sm font-semibold mb-1">🎲 Your draw entries</p>
          <p className="text-white/40 text-sm">
            These score values are your lottery numbers for the next monthly draw.
            Match 3, 4, or 5 of the drawn numbers to win prizes.
          </p>
          {scores.length > 0 && (
            <div className="flex gap-2 mt-3">
              {scores.map(s => (
                <div key={s.id} className="draw-ball">{s.score}</div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}