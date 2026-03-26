'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

const USER_NAV = [
  { href: '/dashboard', label: 'Overview', icon: '⊞' },
  { href: '/dashboard/scores', label: 'My Scores', icon: '⛳' },
  { href: '/dashboard/charity', label: 'My Charity', icon: '❤' },
  { href: '/dashboard/winnings', label: 'Winnings', icon: '🏆' },
]

const ADMIN_NAV = [
  { href: '/admin', label: 'Overview', icon: '⊞' },
  { href: '/admin/users', label: 'Users', icon: '👤' },
  { href: '/admin/charities', label: 'Charities', icon: '❤' },
  { href: '/admin/draws', label: 'Draws', icon: '🎲' },
  { href: '/admin/winners', label: 'Winners', icon: '🏆' },
]

export default function Sidebar({ isAdmin = false, user }) {
  const pathname = usePathname()
  const router = useRouter()
  const nav = isAdmin ? ADMIN_NAV : USER_NAV

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  return (
    <aside className="fixed left-0 top-0 h-full w-60 border-r border-white/5 bg-[#0a0a0f] flex flex-col z-40">
      {/* Logo */}
      <div className="px-5 py-6 border-b border-white/5">
        <Link href="/" className="font-display font-bold text-lg">
          Golf<span className="grad-text">Draw</span>
        </Link>
        {isAdmin && (
          <span className="ml-2 text-[10px] bg-[#f5c87a]/10 text-[#f5c87a] rounded px-1.5 py-0.5">ADMIN</span>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => (
          <Link
            key={item.href}
            href={item.href}
            className={`sidebar-link ${pathname === item.href ? 'active' : ''}`}
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 py-4 border-t border-white/5">
        <div className="px-3 py-2 mb-2">
          <p className="text-xs text-white/60 truncate">{user?.email}</p>
        </div>
        <button onClick={handleSignOut} className="sidebar-link w-full text-red-400 hover:text-red-300 hover:bg-red-500/5">
          <span>↩</span> Sign out
        </button>
      </div>
    </aside>
  )
}
