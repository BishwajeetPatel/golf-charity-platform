'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { getCharities } from '../../../lib/charityLogic'

const STEPS = ['Account', 'Plan', 'Charity']

export default function SignupPage() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [charities, setCharities] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [form, setForm] = useState({
    email: '', password: '', fullName: '',
    plan: 'monthly',
    charityId: '', charityPercentage: 10,
  })

  useEffect(() => {
    getCharities().then(setCharities).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    setError('')

    // 1. Create auth user
    const { data, error: signupErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.fullName } },
    })

    if (signupErr) {
      setError(signupErr.message)
      setLoading(false)
      return
    }

    const userId = data.user?.id
    if (!userId) { setError('Signup failed. Try again.'); setLoading(false); return }

    // 2. Update profile with charity + plan
    await supabase.from('users').update({
      charity_id: form.charityId || null,
      charity_percentage: form.charityPercentage,
      subscription_type: form.plan,
      subscription_status: 'inactive', // requires payment to activate
    }).eq('id', userId)

    router.push('/dashboard?welcome=1')
  }

  const set = (key, val) => setForm(p => ({ ...p, [key]: val }))

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16">
      <div className="w-full max-w-lg animate-fade-up">
        <Link href="/" className="block text-center font-display font-bold text-2xl mb-10">
          Golf<span className="grad-text">Draw</span>
        </Link>

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div className={`flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold
                ${i <= step ? 'bg-[#b8f57a] text-[#0a0a0f]' : 'bg-white/10 text-white/40'}`}>
                {i + 1}
              </div>
              <span className={`text-xs ${i === step ? 'text-white' : 'text-white/30'}`}>{s}</span>
              {i < STEPS.length - 1 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>

        <div className="card">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-6">
              {error}
            </div>
          )}

          {/* Step 0: Account */}
          {step === 0 && (
            <div className="space-y-4">
              <h2 className="font-display text-2xl font-bold mb-6">Create your account</h2>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Full name</label>
                <input className="input" placeholder="Jane Smith" value={form.fullName}
                  onChange={e => set('fullName', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Email</label>
                <input type="email" className="input" placeholder="you@example.com" value={form.email}
                  onChange={e => set('email', e.target.value)} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Password</label>
                <input type="password" className="input" placeholder="Min. 8 characters" value={form.password}
                  onChange={e => set('password', e.target.value)} />
              </div>
              <button className="btn-primary w-full mt-2"
                onClick={() => { if (form.email && form.password && form.fullName) setStep(1) }}>
                Continue →
              </button>
            </div>
          )}

          {/* Step 1: Plan */}
          {step === 1 && (
            <div>
              <h2 className="font-display text-2xl font-bold mb-6">Choose your plan</h2>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {[
                  { key: 'monthly', label: 'Monthly', price: '£9.99', period: '/month', note: '' },
                  { key: 'yearly', label: 'Yearly', price: '£99.99', period: '/year', note: 'Save 17%' },
                ].map(plan => (
                  <button key={plan.key} onClick={() => set('plan', plan.key)}
                    className={`rounded-xl border p-5 text-left transition-all
                      ${form.plan === plan.key
                        ? 'border-[#b8f57a]/50 bg-[#b8f57a]/5'
                        : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    {plan.note && (
                      <span className="text-[10px] text-[#b8f57a] bg-[#b8f57a]/10 rounded px-2 py-0.5 mb-3 block w-fit">
                        {plan.note}
                      </span>
                    )}
                    <p className="font-display text-2xl font-bold">{plan.price}</p>
                    <p className="text-white/40 text-xs">{plan.period}</p>
                    <p className="font-semibold mt-2 text-sm">{plan.label}</p>
                  </button>
                ))}
              </div>
              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(0)}>← Back</button>
                <button className="btn-primary flex-1" onClick={() => setStep(2)}>Continue →</button>
              </div>
            </div>
          )}

          {/* Step 2: Charity */}
          {step === 2 && (
            <div>
              <h2 className="font-display text-2xl font-bold mb-2">Choose your charity</h2>
              <p className="text-white/40 text-sm mb-6">Min. 10% of your subscription goes to your chosen charity.</p>
              <div className="space-y-3 mb-6 max-h-56 overflow-y-auto pr-1">
                {charities.map(c => (
                  <button key={c.id} onClick={() => set('charityId', c.id)}
                    className={`w-full rounded-xl border p-4 text-left transition-all
                      ${form.charityId === c.id
                        ? 'border-[#7af5c8]/50 bg-[#7af5c8]/5'
                        : 'border-white/10 bg-white/5 hover:border-white/20'}`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm
                        ${form.charityId === c.id ? 'bg-[#7af5c8]/20 text-[#7af5c8]' : 'bg-white/10 text-white/50'}`}>❤</div>
                      <div>
                        <p className="font-semibold text-sm">{c.name}</p>
                        <p className="text-white/40 text-xs line-clamp-1">{c.description}</p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>

              <div className="mb-6">
                <label className="text-xs text-white/40 mb-2 block">
                  Contribution percentage: <span className="text-[#7af5c8]">{form.charityPercentage}%</span>
                </label>
                <input type="range" min="10" max="100" step="5"
                  value={form.charityPercentage}
                  onChange={e => set('charityPercentage', parseInt(e.target.value))}
                  className="w-full accent-[#7af5c8]" />
                <div className="flex justify-between text-xs text-white/30 mt-1">
                  <span>10%</span><span>100%</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="btn-secondary flex-1" onClick={() => setStep(1)}>← Back</button>
                <button className="btn-primary flex-1" onClick={handleSubmit} disabled={loading}>
                  {loading ? 'Creating account…' : 'Create account'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-white/40 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-[#b8f57a] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  )
}
