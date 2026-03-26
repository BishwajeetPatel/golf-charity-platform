import { createClient } from '@supabase/supabase-js'

import { createBrowserClient } from '@supabase/ssr'

export const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)



// ─── Typed helper: get current session user ───────────────────────────────────
export async function getUser() {
  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) return null
  return user
}

// ─── Typed helper: get full user profile from public.users ───────────────────
export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from('users')
    .select('*, charities(*)')
    .eq('id', userId)
    .single()
  if (error) return null
  return data
}
