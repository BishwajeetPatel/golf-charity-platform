import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { addScore, validateScore } from '@/lib/scoreLogic'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check subscription
    const { data: profile } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', user.id)
      .single()

    if (!profile || profile.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
    }

    const body = await request.json()
    const { score, played_date } = body

    // Validate
    const validationError = validateScore(score)
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 })
    }

    if (!played_date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 })
    }

    const newScore = await addScore(user.id, parseInt(score), played_date)
    return NextResponse.json({ success: true, data: newScore })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: scores } = await supabase
      .from('scores')
      .select('*')
      .eq('user_id', user.id)
      .order('played_date', { ascending: false })
      .limit(5)

    return NextResponse.json({ scores: scores ?? [] })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
