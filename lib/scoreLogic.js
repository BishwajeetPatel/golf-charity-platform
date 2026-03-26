import { supabase } from './supabaseClient'

// ─── Fetch user's last 5 scores (newest first) ────────────────────────────────
export async function getUserScores(userId) {
  const { data, error } = await supabase
    .from('scores')
    .select('*')
    .eq('user_id', userId)
    .order('played_date', { ascending: false })
    .limit(5)

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Add a new score — enforces rolling 5-score limit ────────────────────────
export async function addScore(userId, score, playedDate) {
  // 1. Fetch existing scores ordered oldest first
  const { data: existing, error: fetchErr } = await supabase
    .from('scores')
    .select('id, played_date')
    .eq('user_id', userId)
    .order('played_date', { ascending: true }) // oldest first

  if (fetchErr) throw new Error(fetchErr.message)

  // 2. If at limit, delete the oldest entry
  if (existing && existing.length >= 5) {
    const oldest = existing[0]
    const { error: deleteErr } = await supabase
      .from('scores')
      .delete()
      .eq('id', oldest.id)

    if (deleteErr) throw new Error(deleteErr.message)
  }

  // 3. Insert the new score
  const { data, error: insertErr } = await supabase
    .from('scores')
    .insert([{ user_id: userId, score, played_date: playedDate }])
    .select()
    .single()

  if (insertErr) throw new Error(insertErr.message)
  return data
}

// ─── Delete a specific score ──────────────────────────────────────────────────
export async function deleteScore(scoreId) {
  const { error } = await supabase
    .from('scores')
    .delete()
    .eq('id', scoreId)

  if (error) throw new Error(error.message)
  return true
}

// ─── Validate score value ─────────────────────────────────────────────────────
export function validateScore(value) {
  const num = parseInt(value, 10)
  if (isNaN(num)) return 'Score must be a number'
  if (num < 1 || num > 45) return 'Score must be between 1 and 45 (Stableford)'
  return null // valid
}
