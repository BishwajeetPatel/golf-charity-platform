'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/utils'

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeSubscribers: 0,
    monthlySubscribers: 0,
    yearlySubscribers: 0,
    totalCharities: 0,
    totalWinnings: 0,
    totalPaid: 0,
    pendingVerifications: 0,
    unpublishedDraws: 0,
    totalDraws: 0,
    jackpotRollovers: 0,
    charityContributions: 0,
  })
  const [charityBreakdown, setCharityBreakdown] = useState([])
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)

      const [
        { count: totalUsers },
        { count: activeSubscribers },
        { count: monthlySubscribers },
        { count: yearlySubscribers },
        { count: totalCharities },
        { data: winningsData },
        { count: pendingVerifications },
        { count: unpublishedDraws },
        { count: totalDraws },
        { count: jackpotRollovers },
        { data: recent },
        { data: charityUsers },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('subscription_type', 'monthly'),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active').eq('subscription_type', 'yearly'),
        supabase.from('charities').select('*', { count: 'exact', head: true }),
        supabase.from('winnings').select('amount, status'),
        supabase.from('winnings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('draws').select('*', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('draws').select('*', { count: 'exact', head: true }),
        supabase.from('draws').select('*', { count: 'exact', head: true }).eq('jackpot_rollover', true),
        supabase.from('users').select('id, email, full_name, subscription_status, subscription_type, created_at')
          .order('created_at', { ascending: false }).limit(5),
        supabase.from('users')
          .select('charity_id, charity_percentage, subscription_type, subscription_status, charities(name)')
          .eq('subscription_status', 'active')
          .not('charity_id', 'is', null),
      ])

      const totalWinnings = (winningsData ?? []).reduce((s, w) => s + parseFloat(w.amount), 0)
      const totalPaid = (winningsData ?? []).filter(w => w.status === 'paid').reduce((s, w) => s + parseFloat(w.amount), 0)

      // Calculate charity contributions
      const PLAN_PRICES = { monthly: 9.99, yearly: 99.99 / 12 }
      let charityContributions = 0
      const charityMap = {}

      for (const u of charityUsers ?? []) {
        const monthly = PLAN_PRICES[u.subscription_type] ?? 9.99
        const contribution = (monthly * (u.charity_percentage ?? 10)) / 100
        charityContributions += contribution
        const name = u.charities?.name ?? 'Unknown'
        charityMap[name] = (charityMap[name] ?? 0) + contribution
      }

      const charityBreakdownArr = Object.entries(charityMap)
        .map(([name, amount]) => ({ name, amount: parseFloat(amount.toFixed(2)) }))
        .sort((a, b) => b.amount - a.amount)

      setStats({
        totalUsers, activeSubscribers, monthlySubscribers, yearlySubscribers,
        totalCharities, totalWinnings, totalPaid,
        pendingVerifications, unpublishedDraws, totalDraws,
        jackpotRollovers, charityContributions: parseFloat(charityContributions.toFixed(2)),
      })
      setCharityBreakdown(charityBreakdownArr)
      setRecentUsers(recent ?? [])
      setLoading(false)
    }
    init()
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  const STAT_CARDS = [
    { label: 'Total users', value: stats.totalUsers, color: 'text-white' },
    { label: 'Active subscribers', value: stats.activeSubscribers, color: 'text-[#b8f57a]' },
    { label: 'Monthly plans', value: stats.monthlySubscribers, color: 'text-white/70' },
    { label: 'Yearly plans', value: stats.yearlySubscribers, color: 'text-white/70' },
    { label: 'Charities listed', value: stats.totalCharities, color: 'text-[#7af5c8]' },
    { label: 'Total paid out', value: formatCurrency(stats.totalPaid), color: 'text-[#f5c87a]' },
    { label: 'Pending verifications', value: stats.pendingVerifications, color: 'text-amber-400' },
    { label: 'Unpublished draws', value: stats.unpublishedDraws, color: 'text-blue-400' },
    { label: 'Total draws run', value: stats.totalDraws, color: 'text-white/70' },
    { label: 'Jackpot rollovers', value: stats.jackpotRollovers, color: 'text-red-400' },
    { label: 'Total prize pool paid', value: formatCurrency(stats.totalWinnings), color: 'text-[#b8f57a]' },
    { label: 'Monthly charity giving', value: formatCurrency(stats.charityContributions), color: 'text-[#7af5c8]' },
  ]

  const QUICK_LINKS = [
    { href: '/admin/draws', label: 'Run draw', icon: '🎲', desc: 'Generate & publish monthly draw' },
    { href: '/admin/winners', label: 'Verify winners', icon: '🏆', desc: 'Review and approve payouts' },
    { href: '/admin/charities', label: 'Manage charities', icon: '❤', desc: 'Add or edit charity listings' },
    { href: '/admin/users', label: 'Manage users', icon: '👤', desc: 'View and edit user accounts' },
  ]

  // Estimate prize pool from active subscribers
  const estimatedPool = (stats.monthlySubscribers * 9.99 + stats.yearlySubscribers * (99.99 / 12)) * 0.5

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} isAdmin />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-white/40 text-sm mb-8">Platform overview, analytics, and controls.</p>

        {/* Alerts */}
        {stats.pendingVerifications > 0 && (
          <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>⚠️</span>
              <p className="text-sm text-amber-400 font-semibold">
                {stats.pendingVerifications} winner{stats.pendingVerifications > 1 ? 's' : ''} pending verification
              </p>
            </div>
            <Link href="/admin/winners" className="text-xs text-amber-400 hover:underline">Review →</Link>
          </div>
        )}
        {stats.unpublishedDraws > 0 && (
          <div className="rounded-2xl border border-blue-400/20 bg-blue-400/5 p-4 mb-6 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span>🎲</span>
              <p className="text-sm text-blue-400 font-semibold">
                {stats.unpublishedDraws} draw{stats.unpublishedDraws > 1 ? 's' : ''} awaiting publish
              </p>
            </div>
            <Link href="/admin/draws" className="text-xs text-blue-400 hover:underline">Publish →</Link>
          </div>
        )}

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 stagger">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-white/40 mb-2">{s.label}</p>
              <p className={`font-display text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {QUICK_LINKS.map(l => (
            <Link key={l.href} href={l.href}
              className="card hover:border-white/15 transition-colors group">
              <p className="text-2xl mb-3">{l.icon}</p>
              <p className="font-display font-bold text-sm group-hover:text-[#b8f57a] transition-colors">{l.label}</p>
              <p className="text-white/30 text-xs mt-1">{l.desc}</p>
            </Link>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Prize pool estimate */}
          <div className="card border-[#b8f57a]/15 bg-[#b8f57a]/5">
            <h2 className="font-display font-bold text-lg mb-4">📊 Prize Pool Estimate</h2>
            <p className="text-xs text-white/40 mb-1">Based on current active subscribers</p>
            <p className="font-display text-4xl font-bold text-[#b8f57a] mb-4">
              {formatCurrency(estimatedPool)}
            </p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-white/50">
                <span>Monthly subs ({stats.monthlySubscribers} × £9.99)</span>
                <span>{formatCurrency(stats.monthlySubscribers * 9.99)}</span>
              </div>
              <div className="flex justify-between text-white/50">
                <span>Yearly subs ({stats.yearlySubscribers} × £8.33/mo)</span>
                <span>{formatCurrency(stats.yearlySubscribers * (99.99 / 12))}</span>
              </div>
              <div className="flex justify-between border-t border-white/10 pt-2 text-white font-semibold">
                <span>50% to prize pool</span>
                <span>{formatCurrency(estimatedPool)}</span>
              </div>
            </div>
          </div>

          {/* Charity contributions breakdown */}
          <div className="card">
            <h2 className="font-display font-bold text-lg mb-4">❤ Charity Contributions (Monthly)</h2>
            <p className="text-xs text-white/40 mb-4">
              Total: <span className="text-[#7af5c8] font-semibold">{formatCurrency(stats.charityContributions)}/month</span>
            </p>
            {charityBreakdown.length === 0 ? (
              <p className="text-white/30 text-sm">No active charity contributions yet.</p>
            ) : (
              <div className="space-y-3">
                {charityBreakdown.map(c => {
                  const pct = stats.charityContributions > 0
                    ? Math.round((c.amount / stats.charityContributions) * 100)
                    : 0
                  return (
                    <div key={c.name}>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-white/70">{c.name}</span>
                        <span className="text-[#7af5c8] font-semibold">{formatCurrency(c.amount)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#7af5c8] to-[#b8f57a]"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Draw statistics */}
        <div className="card mb-6">
          <h2 className="font-display font-bold text-lg mb-4">🎲 Draw Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total draws', value: stats.totalDraws },
              { label: 'Jackpot rollovers', value: stats.jackpotRollovers },
              { label: 'Total winners', value: 'N/A' },
              { label: 'Avg prize pool', value: stats.totalDraws > 0 ? formatCurrency(stats.totalWinnings / stats.totalDraws) : '£0.00' },
            ].map(s => (
              <div key={s.label} className="p-4 rounded-xl bg-white/5 text-center">
                <p className="font-display text-2xl font-bold text-white mb-1">{s.value}</p>
                <p className="text-xs text-white/40">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Recent signups */}
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display font-bold text-lg">Recent signups</h2>
            <Link href="/admin/users" className="text-xs text-[#b8f57a] hover:underline">View all →</Link>
          </div>
          <div className="space-y-3">
            {recentUsers.map(u => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-sm font-medium">{u.full_name ?? '—'}</p>
                  <p className="text-white/40 text-xs">{u.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  {u.subscription_type && (
                    <span className="text-xs text-white/30 capitalize">{u.subscription_type}</span>
                  )}
                  <span className={`badge text-xs ${
                    u.subscription_status === 'active'
                      ? 'bg-emerald-400/10 text-emerald-400'
                      : 'bg-white/5 text-white/30'
                  }`}>
                    {u.subscription_status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}