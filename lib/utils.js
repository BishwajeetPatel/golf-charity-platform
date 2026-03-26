// ─── Format currency ──────────────────────────────────────────────────────────
export function formatCurrency(amount, currency = '£') {
  return `${currency}${Number(amount).toFixed(2)}`
}

// ─── Format date for display ──────────────────────────────────────────────────
export function formatDate(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  })
}

// ─── Get current month string (e.g. "2026-03") ───────────────────────────────
export function getCurrentMonth() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

// ─── Truncate text ────────────────────────────────────────────────────────────
export function truncate(str, len = 80) {
  if (!str) return ''
  return str.length > len ? str.slice(0, len) + '…' : str
}

// ─── Class name merge helper (no clsx dependency needed) ─────────────────────
export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

// ─── Get match label ─────────────────────────────────────────────────────────
export function getMatchLabel(matchType) {
  switch (matchType) {
    case 5: return '🏆 Jackpot'
    case 4: return '🥈 2nd Tier'
    case 3: return '🥉 3rd Tier'
    default: return 'No match'
  }
}

// ─── Status badge color ──────────────────────────────────────────────────────
export function statusColor(status) {
  const map = {
    active: 'text-emerald-400 bg-emerald-400/10',
    inactive: 'text-gray-400 bg-gray-400/10',
    cancelled: 'text-red-400 bg-red-400/10',
    pending: 'text-amber-400 bg-amber-400/10',
    verified: 'text-blue-400 bg-blue-400/10',
    paid: 'text-emerald-400 bg-emerald-400/10',
    rejected: 'text-red-400 bg-red-400/10',
  }
  return map[status] ?? 'text-gray-400 bg-gray-400/10'
}
