import { supabase } from './supabaseClient'

// ─── Prize pool distribution constants ───────────────────────────────────────
export const PRIZE_DISTRIBUTION = {
  5: 0.40, // Jackpot
  4: 0.35,
  3: 0.25,
}

// Monthly subscription prices (for prize pool calc)
const PLAN_PRICES = {
  monthly: 9.99,
  yearly: 99.99 / 12, // monthly equivalent
}

// Percentage of subscription that goes to prize pool
const PRIZE_POOL_PERCENTAGE = 0.50

// ─── Generate 5 unique random numbers (1–45) ─────────────────────────────────
export function generateDrawNumbers() {
  const numbers = new Set()
  while (numbers.size < 5) {
    numbers.add(Math.floor(Math.random() * 45) + 1)
  }
  return Array.from(numbers).sort((a, b) => a - b)
}

// ─── Algorithmic draw: weighted toward least-used scores ─────────────────────
export async function generateAlgorithmicDrawNumbers() {
  // Get all scores from active subscribers
  const { data: scores } = await supabase
    .from('scores')
    .select('score, users!inner(subscription_status)')
    .eq('users.subscription_status', 'active')

  if (!scores || scores.length === 0) return generateDrawNumbers()

  // Count frequency of each score
  const freq = {}
  for (let i = 1; i <= 45; i++) freq[i] = 0
  scores.forEach(s => { freq[s.score] = (freq[s.score] || 0) + 1 })

  // Weight: inverse frequency (less-used = more likely to be drawn)
  const maxFreq = Math.max(...Object.values(freq))
  const weights = {}
  for (let i = 1; i <= 45; i++) {
    weights[i] = (maxFreq - freq[i]) + 1 // +1 to avoid zero weight
  }

  // Weighted random selection (no duplicates)
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0)
  const selected = new Set()

  while (selected.size < 5) {
    let rand = Math.random() * totalWeight
    for (let i = 1; i <= 45; i++) {
      rand -= weights[i]
      if (rand <= 0 && !selected.has(i)) {
        selected.add(i)
        break
      }
    }
  }

  return Array.from(selected).sort((a, b) => a - b)
}

// ─── Count matches between user scores and draw numbers ──────────────────────
export function calculateMatches(userScores, drawNumbers) {
  const drawSet = new Set(drawNumbers)
  const matches = userScores.filter(score => drawSet.has(score))
  return {
    count: matches.length,
    matched: matches,
  }
}

// ─── Calculate total prize pool from active subscribers ──────────────────────
export async function calculatePrizePool(rolledOver = 0) {
  const { data: activeSubs } = await supabase
    .from('users')
    .select('subscription_type')
    .eq('subscription_status', 'active')

  if (!activeSubs || activeSubs.length === 0) return rolledOver

  const total = activeSubs.reduce((sum, user) => {
    const monthlyAmount = PLAN_PRICES[user.subscription_type] ?? PLAN_PRICES.monthly
    return sum + monthlyAmount * PRIZE_POOL_PERCENTAGE
  }, 0)

  return parseFloat((total + rolledOver).toFixed(2))
}

// ─── Run the full draw and save to DB ────────────────────────────────────────
export async function runDraw({ month, useAlgorithm = false, rolledOverAmount = 0 }) {
  // 1. Generate draw numbers
  const drawNumbers = useAlgorithm
    ? await generateAlgorithmicDrawNumbers()
    : generateDrawNumbers()

  // 2. Calculate prize pool
  const totalPool = await calculatePrizePool(rolledOverAmount)

  // 3. Save draw (unpublished)
  const { data: draw, error: drawErr } = await supabase
    .from('draws')
    .insert([{
      draw_numbers: drawNumbers,
      month,
      is_published: false,
      jackpot_rollover: false,
      total_prize_pool: totalPool,
    }])
    .select()
    .single()

  if (drawErr) throw new Error(drawErr.message)

  // 4. Fetch all active subscribers with their scores
  const { data: users } = await supabase
    .from('users')
    .select('id, scores(*)')
    .eq('subscription_status', 'active')

  const winners = { 5: [], 4: [], 3: [] }

  // 5. Find matches for each user
  for (const user of users ?? []) {
    const userScoreValues = (user.scores ?? []).map(s => s.score)
    const { count } = calculateMatches(userScoreValues, drawNumbers)
    if (count >= 3) {
      winners[count]?.push(user.id)
    }
  }

  // 6. Distribute prizes and record winnings
  const winningRecords = []

  for (const [matchType, userIds] of Object.entries(winners)) {
    if (userIds.length === 0) continue
    const poolShare = totalPool * PRIZE_DISTRIBUTION[matchType]
    const amountEach = parseFloat((poolShare / userIds.length).toFixed(2))

    for (const userId of userIds) {
      winningRecords.push({
        user_id: userId,
        draw_id: draw.id,
        match_type: parseInt(matchType),
        amount: amountEach,
        status: 'pending',
      })
    }
  }

  if (winningRecords.length > 0) {
    await supabase.from('winnings').insert(winningRecords)
  }

  // 7. Handle jackpot rollover
  const jackpotRollover = winners[5].length === 0
  if (jackpotRollover) {
    await supabase
      .from('draws')
      .update({ jackpot_rollover: true })
      .eq('id', draw.id)
  }

  return {
    draw,
    drawNumbers,
    totalPool,
    winners,
    winningRecords,
    jackpotRollover,
  }
}

// ─── Publish a draw (make results visible to users) ──────────────────────────
export async function publishDraw(drawId) {
  const { error } = await supabase
    .from('draws')
    .update({ is_published: true })
    .eq('id', drawId)

  if (error) throw new Error(error.message)
  return true
}

// ─── Simulate draw without saving (preview mode) ─────────────────────────────
export async function simulateDraw({ useAlgorithm = false } = {}) {
  const drawNumbers = useAlgorithm
    ? await generateAlgorithmicDrawNumbers()
    : generateDrawNumbers()

  const totalPool = await calculatePrizePool(0)

  const { data: users } = await supabase
    .from('users')
    .select('id, email, scores(*)')
    .eq('subscription_status', 'active')

  const results = []

  for (const user of users ?? []) {
    const userScoreValues = (user.scores ?? []).map(s => s.score)
    const { count, matched } = calculateMatches(userScoreValues, drawNumbers)
    if (count >= 3) {
      results.push({ userId: user.id, email: user.email, matches: count, matched })
    }
  }

  return { drawNumbers, totalPool, results }
}
