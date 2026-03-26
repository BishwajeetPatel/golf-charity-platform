'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getCharities, updateUserCharity, calculateCharityContribution } from '@/lib/charityLogic'
import { PLAN_DETAILS } from '@/lib/subscriptionLogic'
import { formatCurrency } from '@/lib/utils'

export default function CharityPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [charities, setCharities] = useState([])
  const [selected, setSelected] = useState('')
  const [percentage, setPercentage] = useState(10)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const init = async () => {
      const { data: { user: u }, error: userError } = await supabase.auth.getUser()
      if (!mounted) return
      if (userError || !u) { router.push('/login'); return }

      const { data: prof } = await supabase
        .from('users')
        .select('*, charities(*)')
        .eq('id', u.id)
        .single()

      if (!mounted) return
      setUser(u)
      setProfile(prof ?? null)
      setSelected(prof?.charity_id ?? '')
      setPercentage(prof?.charity_percentage ?? 10)

      const c = await getCharities()
      if (!mounted) return
      setCharities(c)
      setLoading(false)
    }
    init()
    return () => { mounted = false }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSave = async () => {
    setSaving(true)
    setSuccess('')
    try {
      await updateUserCharity(user.id, selected, percentage)
      const { data: prof } = await supabase
        .from('users')
        .select('*, charities(*)')
        .eq('id', user.id)
        .single()
      setProfile(prof)
      setSuccess('Charity preferences saved!')
    } catch (err) {
      console.error(err)
    }
    setSaving(false)
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  const monthlyAmount = profile?.subscription_type
    ? PLAN_DETAILS[profile.subscription_type]?.price / (profile.subscription_type === 'yearly' ? 12 : 1)
    : 9.99
  const contribution = calculateCharityContribution(monthlyAmount, percentage)

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} />
      <main className="ml-60 flex-1 p-8 max-w-3xl">
        <h1 className="font-display text-3xl font-bold mb-2">My Charity</h1>
        <p className="text-white/40 text-sm mb-8">
          Choose a charity to support and set how much of your subscription goes to them.
        </p>

        <div className="rounded-2xl border border-[#7af5c8]/20 bg-[#7af5c8]/5 p-6 mb-8">
          <p className="text-[#7af5c8] text-xs font-display uppercase tracking-wider mb-2">Your monthly impact</p>
          <p className="font-display text-4xl font-bold text-white mb-1">
            {formatCurrency(contribution)}
            <span className="text-white/30 text-lg font-normal"> / month</span>
          </p>
          <p className="text-white/40 text-sm">
            {percentage}% of your {profile?.subscription_type ?? 'monthly'} subscription
          </p>
        </div>

        <div className="card mb-6">
          <h2 className="font-display font-bold text-lg mb-5">Choose a charity</h2>
          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {charities.map(c => (
              <button key={c.id} onClick={() => setSelected(c.id)}
                className={`w-full rounded-xl border p-4 text-left transition-all
                  ${selected === c.id
                    ? 'border-[#7af5c8]/50 bg-[#7af5c8]/5'
                    : 'border-white/8 bg-white/5 hover:border-white/15'}`}>
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-colors
                    ${selected === c.id ? 'bg-[#7af5c8]/20 text-[#7af5c8]' : 'bg-white/10 text-white/40'}`}>
                    ❤
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-sm">{c.name}</p>
                      {c.is_featured && <span className="badge text-[10px] bg-[#7af5c8]/10 text-[#7af5c8]">Featured</span>}
                    </div>
                    <p className="text-white/40 text-xs line-clamp-1">{c.description}</p>
                  </div>
                  {selected === c.id && <span className="ml-auto text-[#7af5c8]">✓</span>}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="card mb-6">
          <h2 className="font-display font-bold text-lg mb-2">Contribution amount</h2>
          <p className="text-white/40 text-sm mb-5">Minimum 10%. Increase to give more.</p>
          <div className="flex items-center gap-4 mb-3">
            <input type="range" min="10" max="100" step="5"
              value={percentage}
              onChange={e => setPercentage(parseInt(e.target.value))}
              className="flex-1 accent-[#7af5c8]" />
            <span className="font-display font-bold text-2xl text-[#7af5c8] w-16 text-right">{percentage}%</span>
          </div>
          <div className="flex justify-between text-xs text-white/30">
            <span>10% minimum</span><span>100% maximum</span>
          </div>
        </div>

        {success && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-4">
            ✓ {success}
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !selected} className="btn-primary w-full">
          {saving ? 'Saving…' : 'Save preferences'}
        </button>
      </main>
    </div>
  )
}