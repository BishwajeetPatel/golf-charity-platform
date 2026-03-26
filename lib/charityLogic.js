import { supabase } from './supabaseClient'

// ─── Fetch all charities ──────────────────────────────────────────────────────
export async function getCharities() {
  const { data, error } = await supabase
    .from('charities')
    .select('*')
    .order('is_featured', { ascending: false })
    .order('name')

  if (error) throw new Error(error.message)
  return data ?? []
}

// ─── Fetch featured charity ───────────────────────────────────────────────────
export async function getFeaturedCharity() {
  const { data } = await supabase
    .from('charities')
    .select('*')
    .eq('is_featured', true)
    .single()
  return data
}

// ─── Update user's charity selection and percentage ──────────────────────────
export async function updateUserCharity(userId, charityId, percentage = 10) {
  if (percentage < 10 || percentage > 100) {
    throw new Error('Percentage must be between 10 and 100')
  }

  const { data, error } = await supabase
    .from('users')
    .update({ charity_id: charityId, charity_percentage: percentage })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Calculate charity contribution from subscription ────────────────────────
export function calculateCharityContribution(subscriptionMonthlyAmount, percentage) {
  return parseFloat(((subscriptionMonthlyAmount * percentage) / 100).toFixed(2))
}

// ─── Admin: add charity ───────────────────────────────────────────────────────
export async function addCharity({ name, description, imageUrl, isFeatured = false }) {
  const { data, error } = await supabase
    .from('charities')
    .insert([{ name, description, image_url: imageUrl, is_featured: isFeatured }])
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Admin: delete charity ────────────────────────────────────────────────────
export async function deleteCharity(charityId) {
  const { error } = await supabase
    .from('charities')
    .delete()
    .eq('id', charityId)

  if (error) throw new Error(error.message)
  return true
}
