import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { runDraw, publishDraw, simulateDraw } from '@/lib/drawLogic'
import { getCurrentMonth } from '@/lib/utils'

// Admin only middleware check
async function requireAdmin(supabase) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()
  return profile?.role === 'admin' ? user : null
}

// POST /api/draw — run a new draw (admin only)
export async function POST(request) {
  const supabase = createRouteHandlerClient({ cookies })
  const admin = await requireAdmin(supabase)
  if (!admin) return NextResponse.json({ error: 'Admin access required' }, { status: 403 })

  const body = await request.json()
  const { action, drawId, useAlgorithm, rolledOverAmount } = body

  try {
    if (action === 'simulate') {
      const result = await simulateDraw({ useAlgorithm: !!useAlgorithm })
      return NextResponse.json({ success: true, simulation: result })
    }

    if (action === 'publish') {
      await publishDraw(drawId)
      return NextResponse.json({ success: true })
    }

    // Default: run the draw
    const month = body.month ?? getCurrentMonth()
    const result = await runDraw({
      month,
      useAlgorithm: !!useAlgorithm,
      rolledOverAmount: rolledOverAmount ?? 0,
    })
    return NextResponse.json({ success: true, result })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

// GET /api/draw — fetch draws list (admin sees all, users see published)
export async function GET() {
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'

  let query = supabase.from('draws').select('*').order('created_at', { ascending: false })
  if (!isAdmin) query = query.eq('is_published', true)

  const { data: draws } = await query
  return NextResponse.json({ draws: draws ?? [] })
}
