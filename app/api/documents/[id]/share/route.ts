import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type Params = { params: { id: string } }

export async function POST(request: NextRequest, { params }: Params) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Only the owner can share
  const { data: doc } = await supabase
    .from('documents')
    .select('owner_id')
    .eq('id', params.id)
    .single()

  if (!doc) return NextResponse.json({ error: 'Document not found' }, { status: 404 })
  if (doc.owner_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const email = String(body.email ?? '').trim().toLowerCase()
  const permission = body.permission === 'view' ? 'view' : 'edit'

  if (!email) return NextResponse.json({ error: 'Email is required' }, { status: 400 })
  if (email === user.email) return NextResponse.json({ error: 'Cannot share with yourself' }, { status: 400 })

  // Look up the target user
  const { data: targetProfile } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .single()

  if (!targetProfile) {
    return NextResponse.json({ error: `No account found for ${email}` }, { status: 404 })
  }

  // Upsert the share
  const { data, error } = await supabase
    .from('document_shares')
    .upsert(
      { document_id: params.id, shared_with_id: targetProfile.id, permission },
      { onConflict: 'document_id,shared_with_id' }
    )
    .select('*, shared_with:profiles!shared_with_id(id, email, full_name)')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data, { status: 201 })
}

export async function DELETE(request: NextRequest, { params }: Params) {
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

  const body = await request.json().catch(() => ({}))
  const shareId = String(body.shareId ?? '')

  if (!shareId) return NextResponse.json({ error: 'shareId is required' }, { status: 400 })

  const { error } = await supabase
    .from('document_shares')
    .delete()
    .eq('id', shareId)
    .eq('document_id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
