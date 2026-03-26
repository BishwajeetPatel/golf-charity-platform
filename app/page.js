'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'

export default function LandingPage() {
  const router = useRouter()
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        supabase.from('users').select('role').eq('id', session.user.id).single()
          .then(({ data }) => {
            router.push(data?.role === 'admin' ? '/admin' : '/dashboard')
          })
      } else {
        setChecking(false)
      }
    })
  }, [])

  if (checking) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white overflow-x-hidden">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-5 border-b border-white/5 bg-[#0a0a0f]/80 backdrop-blur-md">
        <span className="font-display font-bold text-xl">
          Golf<span className="grad-text">Draw</span>
        </span>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm text-white/60 hover:text-white transition-colors">
            Sign in
          </Link>
          <Link href="/signup" className="btn-primary text-sm py-2 px-4">
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center justify-center px-6 pt-20">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full bg-[#b8f57a]/5 blur-[120px]" />
          <div className="absolute top-1/2 left-1/4 w-[400px] h-[300px] rounded-full bg-[#7af5c8]/4 blur-[100px]" />
        </div>

        <div className="relative text-center max-w-4xl mx-auto animate-fade-up">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#b8f57a]/20 bg-[#b8f57a]/5 px-4 py-2 text-xs text-[#b8f57a] mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-[#b8f57a] animate-pulse" />
            Monthly draws now live · Next draw in 12 days
          </div>

          <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.05] mb-6">
            Play Golf.
            <br />
            <span className="grad-text">Give Back.</span>
            <br />
            Win Big.
          </h1>

          <p className="text-white/50 text-lg md:text-xl max-w-2xl mx-auto mb-10 leading-relaxed">
            The only golf subscription that turns your Stableford scores into lottery numbers — while funding the charities you care about.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/signup" className="btn-primary text-base px-8 py-4">
              Start for £9.99/month →
            </Link>
            <a href="#how-it-works" className="btn-secondary text-base px-8 py-4">
              See how it works
            </a>
          </div>

          {/* Social proof */}
          <div className="mt-12 flex items-center justify-center gap-8 text-sm text-white/30">
            <span>✓ Cancel anytime</span>
            <span>✓ Min. 10% to charity</span>
            <span>✓ Monthly prize draws</span>
          </div>
        </div>

        {/* Floating draw balls */}
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 flex gap-3 opacity-30">
          {[14, 27, 8, 33, 41].map((n) => (
            <div key={n} className="draw-ball w-12 h-12 text-base">{n}</div>
          ))}
        </div>
      </section>

      {/* STATS */}
      <section className="py-20 px-6 border-y border-white/5 bg-white/[0.02]">
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center stagger">
          {[
            { value: '£9.99', label: 'per month' },
            { value: '50%', label: 'goes to prize pool' },
            { value: '10%+', label: 'to your charity' },
            { value: 'Monthly', label: 'prize draws' },
          ].map(s => (
            <div key={s.label}>
              <p className="font-display text-3xl md:text-4xl font-bold grad-text mb-1">{s.value}</p>
              <p className="text-white/40 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#b8f57a] text-xs font-display uppercase tracking-widest mb-3">How it works</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Three steps to win</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Subscribe & choose your charity',
                desc: 'Pick a monthly or yearly plan. Select a charity — a minimum of 10% of your subscription goes directly to them.',
                color: '#b8f57a',
              },
              {
                step: '02',
                title: 'Log your Stableford scores',
                desc: 'Enter your last 5 golf scores (1–45). These become your personal lottery numbers for the monthly draw.',
                color: '#7af5c8',
              },
              {
                step: '03',
                title: 'Win from the prize pool',
                desc: 'Match 3, 4, or all 5 drawn numbers. 50% of all subscriptions fund the prize pool each month.',
                color: '#f5c87a',
              },
            ].map(item => (
              <div key={item.step} className="card relative overflow-hidden group hover:border-white/15 transition-colors">
                <p className="font-display text-6xl font-bold opacity-10 absolute top-4 right-6" style={{ color: item.color }}>
                  {item.step}
                </p>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg mb-4" style={{ background: `${item.color}15`, color: item.color }}>
                  {item.step === '01' ? '❤' : item.step === '02' ? '⛳' : '🏆'}
                </div>
                <h3 className="font-display font-bold text-lg mb-2">{item.title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRIZE POOL */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#7af5c8] text-xs font-display uppercase tracking-widest mb-3">Prize structure</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">How prizes are distributed</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[
              { match: '5 numbers', prize: '40%', label: 'Jackpot', note: 'Rolls over if unclaimed', color: '#b8f57a', icon: '🏆' },
              { match: '4 numbers', prize: '35%', label: '2nd Tier', note: 'Split equally among winners', color: '#7af5c8', icon: '🥈' },
              { match: '3 numbers', prize: '25%', label: '3rd Tier', note: 'Split equally among winners', color: '#f5c87a', icon: '🥉' },
            ].map(tier => (
              <div key={tier.match} className="card text-center border-white/10 hover:border-white/20 transition-colors">
                <p className="text-3xl mb-3">{tier.icon}</p>
                <p className="text-xs text-white/40 mb-1">{tier.match}</p>
                <p className="font-display text-4xl font-bold mb-1" style={{ color: tier.color }}>{tier.prize}</p>
                <p className="font-semibold text-sm mb-1">{tier.label}</p>
                <p className="text-white/30 text-xs">{tier.note}</p>
              </div>
            ))}
          </div>

          <div className="card bg-gradient-to-r from-[#b8f57a]/5 to-[#7af5c8]/5 border-[#b8f57a]/20 text-center">
            <p className="text-white/60 text-sm">
              The prize pool grows with every subscriber. <span className="text-white font-semibold">50% of all monthly subscriptions</span> go directly into the draw pool each month.
            </p>
          </div>
        </div>
      </section>

      {/* CHARITY */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <p className="text-[#7af5c8] text-xs font-display uppercase tracking-widest mb-3">Charity impact</p>
              <h2 className="font-display text-4xl md:text-5xl font-bold mb-6 leading-tight">
                Play golf.<br />
                <span className="text-[#7af5c8]">Fund causes</span><br />
                that matter.
              </h2>
              <p className="text-white/50 leading-relaxed mb-6">
                Every subscription contributes to a charity of your choosing. Set a minimum of 10% — or give more. You decide how much of your subscription goes to your cause.
              </p>
              <div className="space-y-3">
                {['Woodland Trust', 'Mind UK', 'Macmillan Cancer Support', 'RNLI'].map(c => (
                  <div key={c} className="flex items-center gap-3 text-sm">
                    <div className="w-7 h-7 rounded-lg bg-[#7af5c8]/10 flex items-center justify-center text-[#7af5c8] text-xs">❤</div>
                    <span className="text-white/70">{c}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="card border-[#7af5c8]/20 bg-[#7af5c8]/5">
              <p className="text-[#7af5c8] text-xs font-display uppercase tracking-widest mb-4">Example impact</p>
              <div className="space-y-4">
                {[
                  { plan: 'Monthly · £9.99', pct: '10%', amount: '£1.00/mo' },
                  { plan: 'Monthly · £9.99', pct: '25%', amount: '£2.50/mo' },
                  { plan: 'Yearly · £99.99', pct: '10%', amount: '£10.00/yr' },
                  { plan: 'Yearly · £99.99', pct: '50%', amount: '£50.00/yr' },
                ].map(row => (
                  <div key={row.plan + row.pct} className="flex items-center justify-between text-sm py-2 border-b border-white/5 last:border-0">
                    <span className="text-white/50">{row.plan} · {row.pct}</span>
                    <span className="font-bold text-[#7af5c8]">{row.amount}</span>
                  </div>
                ))}
              </div>
              <p className="text-white/30 text-xs mt-4">Your charity gets paid regardless of whether you win.</p>
            </div>
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section className="py-24 px-6 bg-white/[0.02] border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <p className="text-[#b8f57a] text-xs font-display uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="font-display text-4xl md:text-5xl font-bold">Simple, transparent plans</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {[
              {
                name: 'Monthly',
                price: '£9.99',
                period: '/month',
                features: ['Full draw participation', 'Up to 5 score entries', 'Charity contribution', 'Prize pool access'],
                cta: 'Start monthly',
                highlight: false,
              },
              {
                name: 'Yearly',
                price: '£99.99',
                period: '/year',
                badge: 'Save 17%',
                features: ['Everything in Monthly', '12 months of draws', 'Best value', 'Priority support'],
                cta: 'Start yearly',
                highlight: true,
              },
            ].map(plan => (
              <div key={plan.name} className={`card ${plan.highlight ? 'border-[#b8f57a]/30 bg-[#b8f57a]/5' : ''}`}>
                {plan.badge && (
                  <span className="inline-block text-[10px] text-[#b8f57a] bg-[#b8f57a]/10 rounded px-2 py-0.5 mb-3">{plan.badge}</span>
                )}
                <p className="font-display text-3xl font-bold">{plan.price}</p>
                <p className="text-white/40 text-sm mb-1">{plan.period}</p>
                <p className="font-semibold mb-5">{plan.name}</p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-white/60">
                      <span className="text-[#b8f57a]">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={plan.highlight ? 'btn-primary w-full text-center' : 'btn-secondary w-full text-center'}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold mb-6">
            Ready to play,<br />
            <span className="grad-text">give, and win?</span>
          </h2>
          <p className="text-white/50 mb-10 text-lg">Join today. Enter your scores. Support a cause. Win prizes.</p>
          <Link href="/signup" className="btn-primary text-base px-10 py-4 text-lg">
            Create your account →
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 px-8 py-8 flex items-center justify-between text-sm text-white/30">
        <span className="font-display font-bold text-white/60">Golf<span className="text-[#b8f57a]">Draw</span></span>
        <span>© 2026 GolfDraw. All rights reserved.</span>
        <div className="flex gap-4">
          <Link href="/login" className="hover:text-white transition-colors">Sign in</Link>
          <Link href="/signup" className="hover:text-white transition-colors">Sign up</Link>
        </div>
      </footer>
    </div>
  )
}