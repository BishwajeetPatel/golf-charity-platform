'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import { supabase } from '@/lib/supabaseClient'
import { getUserProfile } from '@/lib/supabaseClient'
import { addCharity, deleteCharity } from '@/lib/charityLogic'

export default function AdminCharitiesPage() {
  const router = useRouter()
  const [user, setUser] = useState(null)
  const [charities, setCharities] = useState([])
  const [form, setForm] = useState({ name: '', description: '', imageUrl: '', isFeatured: false })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchCharities = async () => {
    const { data } = await supabase.from('charities').select('*').order('created_at', { ascending: false })
    setCharities(data ?? [])
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user: u } } = await supabase.auth.getUser()
      if (!u) { router.push('/login'); return }
      const prof = await getUserProfile(u.id)
      if (!prof || prof.role !== 'admin') { router.push('/dashboard'); return }
      setUser(u)
      await fetchCharities()
      setLoading(false)
    }
    init()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { setError('Name is required.'); return }
    setSubmitting(true)
    setError('')
    setSuccess('')
    try {
      await addCharity({ name: form.name, description: form.description, imageUrl: form.imageUrl, isFeatured: form.isFeatured })
      setSuccess('Charity added!')
      setForm({ name: '', description: '', imageUrl: '', isFeatured: false })
      await fetchCharities()
    } catch (err) {
      setError(err.message)
    }
    setSubmitting(false)
  }

  const handleDelete = async (id) => {
    if (!confirm('Delete this charity?')) return
    await deleteCharity(id)
    await fetchCharities()
  }

  const handleToggleFeatured = async (id, current) => {
    await supabase.from('charities').update({ is_featured: !current }).eq('id', id)
    await fetchCharities()
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
        <h1 className="font-display text-3xl font-bold mb-2">Charities</h1>
        <p className="text-white/40 text-sm mb-8">Manage charity listings shown to subscribers.</p>

        {/* Add form */}
        <div className="card mb-8">
          <h2 className="font-display font-bold text-lg mb-5">Add charity</h2>
          {error && <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm px-4 py-3 mb-4">{error}</div>}
          {success && <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm px-4 py-3 mb-4">✓ {success}</div>}

          <form onSubmit={handleAdd} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Charity name *</label>
                <input className="input" placeholder="e.g. Woodland Trust" value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs text-white/40 mb-1.5 block">Image URL (optional)</label>
                <input className="input" placeholder="https://…" value={form.imageUrl}
                  onChange={e => setForm(p => ({ ...p, imageUrl: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs text-white/40 mb-1.5 block">Description</label>
              <textarea className="input h-20 resize-none" placeholder="Brief description…"
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-3">
              <button type="button"
                onClick={() => setForm(p => ({ ...p, isFeatured: !p.isFeatured }))}
                className={`relative w-10 h-5 rounded-full transition-colors ${form.isFeatured ? 'bg-[#7af5c8]' : 'bg-white/10'}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all ${form.isFeatured ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-white/60">Featured / spotlight on homepage</span>
            </div>
            <button type="submit" disabled={submitting} className="btn-primary">
              {submitting ? 'Adding…' : '+ Add charity'}
            </button>
          </form>
        </div>

        {/* Charity list */}
        <div className="card">
          <h2 className="font-display font-bold text-lg mb-5">All charities ({charities.length})</h2>
          {charities.length === 0 ? (
            <p className="text-white/30 text-sm">No charities yet.</p>
          ) : (
            <div className="space-y-3">
              {charities.map(c => (
                <div key={c.id}
                  className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/5">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-[#7af5c8]/10 flex items-center justify-center text-[#7af5c8]">❤</div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{c.name}</p>
                        {c.is_featured && (
                          <span className="badge text-[10px] bg-[#7af5c8]/10 text-[#7af5c8]">Featured</span>
                        )}
                      </div>
                      <p className="text-white/40 text-xs line-clamp-1">{c.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button onClick={() => handleToggleFeatured(c.id, c.is_featured)}
                      className="text-xs text-white/40 hover:text-[#7af5c8] transition-colors">
                      {c.is_featured ? 'Unfeature' : 'Feature'}
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="text-xs text-white/30 hover:text-red-400 transition-colors">
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
