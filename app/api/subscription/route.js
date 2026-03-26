import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { activateSubscription, cancelSubscription } from '@/lib/subscriptionLogic'

export async function POST(request) {
  try {
    const supabase = createRouteHandlerClient({ cookies })
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { action, planType } = await request.json()

    if (action === 'activate') {
      if (!planType) return NextResponse.json({ error: 'Plan type required' }, { status: 400 })
      const updated = await activateSubscription(user.id, planType)
      return NextResponse.json({ success: true, user: updated })
    }

    if (action === 'cancel') {
      const updated = await cancelSubscription(user.id)
      return NextResponse.json({ success: true, user: updated })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
