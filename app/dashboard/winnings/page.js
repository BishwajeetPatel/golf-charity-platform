'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { formatCurrency, formatDate, getMatchLabel, statusColor } from '@/lib/utils'

export default function WinningsPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [winnings, setWinnings] = useState([])
  const [draws, setDraws] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(null) // winning id being uploaded
  const [uploadError, setUploadError] = useState('')
  const [uploadSuccess, setUploadSuccess] = useState('')

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { user: u }, error: userError } = await supabase.auth.getUser()
      if (!mounted) return
      if (userError || !u) { router.push('/login'); return }

      setUser(u)

      const [{ data: wins }, { data: publishedDraws }] = await Promise.all([
        supabase.from('winnings')
          .select('*, draws(month, draw_numbers, total_prize_pool)')
          .eq('user_id', u.id)
          .order('created_at', { ascending: false }),
        supabase.from('draws')
          .select('*')
          .eq('is_published', true)
          .order('created_at', { ascending: false })
          .limit(6),
      ])

      if (!mounted) return
      setWinnings(wins ?? [])
      setDraws(publishedDraws ?? [])
      setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleProofUpload = async (winningId, file) => {
    if (!file) return
    setUploading(winningId)
    setUploadError('')
    setUploadSuccess('')

    try {
      // Upload to Supabase storage bucket "winner-proofs"
      const ext = file.name.split('.').pop()
      const filePath = `${user.id}/${winningId}.${ext}`

      const { error: uploadErr } = await supabase.storage
        .from('winner-proofs')
        .upload(filePath, file, { upsert: true })

      if (uploadErr) throw new Error(uploadErr.message)

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('winner-proofs')
        .getPublicUrl(filePath)

      // Update winning record with proof URL
      const { error: updateErr } = await supabase
        .from('winnings')
        .update({ proof_url: urlData.publicUrl })
        .eq('id', winningId)

      if (updateErr) throw new Error(updateErr.message)

      // Refresh winnings
      const { data: updated } = await supabase
        .from('winnings')
        .select('*, draws(month, draw_numbers, total_prize_pool)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      setWinnings(updated ?? [])
      setUploadSuccess('Proof uploaded successfully! Admin will review your submission.')
    } catch (err) {
      setUploadError(err.message)
    }
    setUploading(null)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  const totalWon = winnings.reduce((s, w) => s + parseFloat(w.amount), 0)
  const totalPaid = winnings.filter(w => w.status === 'paid').reduce((s, w) => s + parseFloat(w.amount), 0)
  const pendingCount = winnings.filter(w => w.status === 'pending').length

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Winnings</h1>
        <p className="text-white/40 text-sm mb-8">Your draw results, prize history, and winner verification.</p>

        {/* Alerts */}
        {uploadError && (
          <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-6">
            {uploadError}
          </div>
        )}
        {uploadSuccess && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-6">
            ✓ {uploadSuccess}
          </div>
        )}

        {/* Pending verification banner */}
        {pendingCount > 0 && (
          <div className="rounded-2xl border border-[#f5c87a]/20 bg-[#f5c87a]/5 p-5 mb-8 flex items-start gap-4">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-semibold text-[#f5c87a] mb-1">
                {pendingCount} prize{pendingCount > 1 ? 's' : ''} pending verification
              </p>
              <p className="text-white/50 text-sm">
                Upload a screenshot of your scores from your golf platform to verify your win and receive payment.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
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
          {/* Prize history with proof upload */}
          <div className="card">
            <h2 className="font-display font-bold text-lg mb-5">Prize history</h2>
            {winnings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-4xl mb-3">🎲</p>
                <p className="text-white/30 text-sm">No winnings yet — keep logging scores!</p>
              </div>
            ) : (
              <div className="space-y-4">
                {winnings.map(w => (
                  <div key={w.id} className={`p-4 rounded-xl border ${
                    w.status === 'pending' ? 'border-[#f5c87a]/20 bg-[#f5c87a]/5' : 'border-white/5 bg-white/5'
                  }`}>
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

                    {/* Draw numbers */}
                    <div className="flex gap-1 mb-3">
                      {w.draws?.draw_numbers?.map(n => (
                        <div key={n} className="draw-ball w-7 h-7 text-xs">{n}</div>
                      ))}
                    </div>

                    {/* Proof upload section — only for pending */}
                    {w.status === 'pending' && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        {w.proof_url ? (
                          <div className="flex items-center gap-2">
                            <span className="text-emerald-400 text-xs">✓ Proof submitted</span>
                            <a
                              href={w.proof_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-[#b8f57a] hover:underline"
                            >
                              View
                            </a>
                          </div>
                        ) : (
                          <div>
                            <p className="text-xs text-white/40 mb-2">
                              Upload a screenshot of your scores to verify this win
                            </p>
                            <label className={`inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-dashed cursor-pointer transition-all
                              ${uploading === w.id
                                ? 'border-white/20 text-white/30'
                                : 'border-[#f5c87a]/30 text-[#f5c87a] hover:bg-[#f5c87a]/5'
                              }`}>
                              {uploading === w.id ? (
                                <>
                                  <div className="w-3 h-3 rounded-full border border-white/30 border-t-transparent animate-spin" />
                                  Uploading…
                                </>
                              ) : (
                                <>
                                  📎 Upload proof screenshot
                                </>
                              )}
                              <input
                                type="file"
                                accept="image/*,.pdf"
                                className="hidden"
                                disabled={uploading === w.id}
                                onChange={e => {
                                  const file = e.target.files?.[0]
                                  if (file) handleProofUpload(w.id, file)
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Verified/paid status */}
                    {w.status === 'verified' && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-blue-400">✓ Verified — payment being processed</p>
                      </div>
                    )}
                    {w.status === 'paid' && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-emerald-400">✓ Payment completed</p>
                      </div>
                    )}
                    {w.status === 'rejected' && (
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <p className="text-xs text-red-400">✗ Verification rejected — contact support</p>
                      </div>
                    )}
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

        {/* Verification guide */}
        <div className="mt-6 card border-white/5">
          <h3 className="font-display font-bold mb-3">📋 Winner verification guide</h3>
          <div className="grid md:grid-cols-3 gap-4 text-sm text-white/50">
            <div className="flex gap-3">
              <span className="text-[#b8f57a] font-bold">1.</span>
              <span>Take a screenshot of your scores from your golf club's scoring platform (e.g. ClubV1, Golf Genius)</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#b8f57a] font-bold">2.</span>
              <span>Upload the screenshot using the button next to your pending prize</span>
            </div>
            <div className="flex gap-3">
              <span className="text-[#b8f57a] font-bold">3.</span>
              <span>Our team will verify within 2–3 business days and process payment once approved</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}