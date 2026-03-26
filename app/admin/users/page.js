'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { formatDate, statusColor } from '@/lib/utils'

export default function AdminUsersPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [users, setUsers] = useState([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*, charities(name)')
      .order('created_at', { ascending: false })
    setUsers(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)
      await fetchUsers()
      setLoading(false)
    }
    init()
  }, [])

  const handleToggleSubscription = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    await supabase.from('users').update({ subscription_status: newStatus }).eq('id', userId)
    await fetchUsers()
  }

  const filtered = users.filter(u =>
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 rounded-full border-2 border-[#b8f57a] border-t-transparent animate-spin" />
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} isAdmin />
      <main className="ml-60 flex-1 p-8">
        <h1 className="font-display text-3xl font-bold mb-2">Users</h1>
        <p className="text-white/40 text-sm mb-8">Manage user accounts and subscriptions.</p>

        {/* Search */}
        <div className="mb-6">
          <input
            className="input max-w-sm"
            placeholder="Search by name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {/* Table */}
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/5">
                  {['Name', 'Email', 'Plan', 'Status', 'Charity', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="text-left text-xs text-white/30 px-5 py-4 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(u => (
                  <tr key={u.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02]">
                    <td className="px-5 py-3">
                      <p className="font-medium">{u.full_name ?? '—'}</p>
                      {u.role === 'admin' && (
                        <span className="text-[10px] text-[#f5c87a]">ADMIN</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-white/60">{u.email}</td>
                    <td className="px-5 py-3 text-white/60 capitalize">{u.subscription_type ?? '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`badge text-xs ${statusColor(u.subscription_status)}`}>
                        {u.subscription_status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-white/60">{u.charities?.name ?? '—'}</td>
                    <td className="px-5 py-3 text-white/40">{formatDate(u.created_at)}</td>
                    <td className="px-5 py-3">
                      <button
                        onClick={() => handleToggleSubscription(u.id, u.subscription_status)}
                        className="text-xs text-white/40 hover:text-[#b8f57a] transition-colors"
                      >
                        Toggle sub
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filtered.length === 0 && (
            <p className="text-center text-white/30 text-sm py-10">No users found.</p>
          )}
        </div>
      </main>
    </div>
  )
}
