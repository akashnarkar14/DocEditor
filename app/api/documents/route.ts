import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [ownedResult, sharedResult] = await Promise.all([
    supabase
      .from('documents')
      .select('*, owner:profiles!owner_id(id, email, full_name)')
      .eq('owner_id', user.id)
      .order('updated_at', { ascending: false }),

    supabase
      .from('document_shares')
      .select('permission, document:documents(*, owner:profiles!owner_id(id, email, full_name))')
      .eq('shared_with_id', user.id)
      .order('created_at', { ascending: false }),
  ])

  const owned = ownedResult.data ?? []
  const shared = (sharedResult.data ?? [])
    .filter(s => s.document)
    .map(s => ({ ...(s.document as Record<string, unknown>), permission: s.permission }))

  return NextResponse.json({ owned, shared })
}

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json().catch(() => ({}))
  const title = (body.title as string)?.trim() || 'Untitled Document'
  const content = body.content ?? { type: 'doc', content: [{ type: 'paragraph' }] }

  if (title.length > 500) {
    return NextResponse.json({ error: 'Title too long' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('documents')
    .insert({ title, content, owner_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
