import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import EditorPage from '@/components/editor/EditorPage'

export const dynamic = 'force-dynamic'

export default async function DocumentPage({ params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch document with owner profile
  const { data: doc } = await supabase
    .from('documents')
    .select('*, owner:profiles!owner_id(id, email, full_name)')
    .eq('id', params.id)
    .single()

  if (!doc) notFound()

  const isOwner = doc.owner_id === user.id

  // Check share access if not owner
  let permission: 'edit' | 'view' | null = null
  if (!isOwner) {
    const { data: share } = await supabase
      .from('document_shares')
      .select('permission')
      .eq('document_id', params.id)
      .eq('shared_with_id', user.id)
      .single()

    if (!share) notFound()
    permission = share.permission as 'edit' | 'view'
  }

  // Fetch current shares (only for owner)
  const shares = isOwner
    ? (await supabase
        .from('document_shares')
        .select('*, shared_with:profiles!shared_with_id(id, email, full_name)')
        .eq('document_id', params.id)
      ).data ?? []
    : []

  const documentWithMeta = {
    ...doc,
    permission: isOwner ? ('edit' as const) : permission!,
    shares,
  }

  return <EditorPage document={documentWithMeta} userId={user.id} />
}
