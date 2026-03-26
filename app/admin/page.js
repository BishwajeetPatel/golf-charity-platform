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
    totalCharities: 0,
    totalWinnings: 0,
    pendingVerifications: 0,
    unpublishedDraws: 0,
  })
  const [recentUsers, setRecentUsers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)

      // Fetch stats in parallel
      const [
        { count: totalUsers },
        { count: activeSubscribers },
        { count: totalCharities },
        { data: winningsData },
        { count: pendingVerifications },
        { count: unpublishedDraws },
        { data: recent },
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
        supabase.from('charities').select('*', { count: 'exact', head: true }),
        supabase.from('winnings').select('amount'),
        supabase.from('winnings').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
        supabase.from('draws').select('*', { count: 'exact', head: true }).eq('is_published', false),
        supabase.from('users').select('id, email, full_name, subscription_status, created_at')
          .order('created_at', { ascending: false }).limit(5),
      ])

      const totalWinnings = (winningsData ?? []).reduce((s, w) => s + parseFloat(w.amount), 0)

      setStats({ totalUsers, activeSubscribers, totalCharities, totalWinnings, pendingVerifications, unpublishedDraws })
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
    { label: 'Charities listed', value: stats.totalCharities, color: 'text-[#7af5c8]' },
    { label: 'Total paid out', value: formatCurrency(stats.totalWinnings), color: 'text-[#f5c87a]' },
    { label: 'Pending verifications', value: stats.pendingVerifications, color: 'text-amber-400' },
    { label: 'Unpublished draws', value: stats.unpublishedDraws, color: 'text-blue-400' },
  ]

  const QUICK_LINKS = [
    { href: '/admin/draws', label: 'Run draw', icon: '🎲', desc: 'Generate & publish monthly draw' },
    { href: '/admin/winners', label: 'Verify winners', icon: '🏆', desc: 'Review and approve payouts' },
    { href: '/admin/charities', label: 'Manage charities', icon: '❤', desc: 'Add or edit charity listings' },
    { href: '/admin/users', label: 'Manage users', icon: '👤', desc: 'View and edit user accounts' },
  ]

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} isAdmin />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Admin Panel</h1>
        <p className="text-white/40 text-sm mb-8">Platform overview and controls.</p>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8 stagger">
          {STAT_CARDS.map(s => (
            <div key={s.label} className="card">
              <p className="text-xs text-white/40 mb-2">{s.label}</p>
              <p className={`font-display text-3xl font-bold ${s.color}`}>{s.value}</p>
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
                <span className={`badge text-xs ${
                  u.subscription_status === 'active'
                    ? 'bg-emerald-400/10 text-emerald-400'
                    : 'bg-white/5 text-white/30'
                }`}>
                  {u.subscription_status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
