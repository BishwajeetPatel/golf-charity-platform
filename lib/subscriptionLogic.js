import { supabase } from './supabaseClient'

export const PLAN_DETAILS = {
  monthly: {
    label: 'Monthly',
    price: 9.99,
    currency: '£',
    billingPeriod: 'per month',
    durationDays: 30,
  },
  yearly: {
    label: 'Yearly',
    price: 99.99,
    currency: '£',
    billingPeriod: 'per year',
    durationDays: 365,
    savingsNote: 'Save 17% vs monthly',
  },
}

// ─── Activate subscription (mock — replace with Stripe webhook in production) ─
export async function activateSubscription(userId, planType) {
  const plan = PLAN_DETAILS[planType]
  if (!plan) throw new Error('Invalid plan type')

  const now = new Date()
  const end = new Date(now)
  end.setDate(end.getDate() + plan.durationDays)

  const { data, error } = await supabase
    .from('users')
    .update({
      subscription_type: planType,
      subscription_status: 'active',
      subscription_start: now.toISOString(),
      subscription_end: end.toISOString(),
    })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Cancel subscription ──────────────────────────────────────────────────────
export async function cancelSubscription(userId) {
  const { data, error } = await supabase
    .from('users')
    .update({ subscription_status: 'cancelled' })
    .eq('id', userId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

// ─── Check if user has active subscription ────────────────────────────────────
export function isSubscriptionActive(user) {
  if (!user || user.subscription_status !== 'active') return false
  if (!user.subscription_end) return false
  return new Date(user.subscription_end) > new Date()
}

// ─── Get days remaining on subscription ───────────────────────────────────────
export function daysRemaining(user) {
  if (!isSubscriptionActive(user)) return 0
  const diff = new Date(user.subscription_end) - new Date()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}
