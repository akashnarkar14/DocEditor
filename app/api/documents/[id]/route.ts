import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

async function getDocumentAccess(supabase: ReturnType<typeof createClient>, docId: string, userId: string) {
  const { data: doc } = await supabase
    .from('documents')
    .select('*, owner:profiles!owner_id(id, email, full_name)')
    .eq('id', docId)
    .single()

  if (!doc) return { doc: null, isOwner: false, canEdit: false }

  const isOwner = doc.owner_id === userId
  if (isOwner) return { doc, isOwner: true, canEdit: true }

  const { data: share } = await supabase
    .from('document_shares')
    .select('permission')
    .eq('document_id', docId)
    .eq('shared_with_id', userId)
    .single()

  if (!share) return { doc: null, isOwner: false, canEdit: false }

  return { doc, isOwner: false, canEdit: share.permission === 'edit' }
}

export async function GET(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { doc } = await getDocumentAccess(supabase, params.id, user.id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const { data: shares } = await supabase
    .from('document_shares')
    .select('*, shared_with:profiles!shared_with_id(id, email, full_name)')
    .eq('document_id', params.id)

  return NextResponse.json({ ...doc, shares: shares ?? [] })
}

export async function PUT(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { doc, canEdit } = await getDocumentAccess(supabase, params.id, user.id)
  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!canEdit) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() }

  if (body.title !== undefined) {
    const title = String(body.title).trim()
    if (!title) return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 })
    if (title.length > 500) return NextResponse.json({ error: 'Title too long' }, { status: 400 })
    updates.title = title
  }
  if (body.content !== undefined) {
    updates.content = body.content
  }

  const { data, error } = await supabase
    .from('documents')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: doc } = await supabase
    .from('documents')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (doc.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { error } = await supabase.from('documents').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
