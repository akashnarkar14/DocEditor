import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './DashboardClient'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [ownedResult, sharedResult, shareCountResult] = await Promise.all([
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

    // Count how many people each owned doc is shared with
    supabase
      .from('document_shares')
      .select('document_id')
      .in(
        'document_id',
        // We'll compute this client-side if owned list is empty
        ['00000000-0000-0000-0000-000000000000']
      ),
  ])

  const owned = ownedResult.data ?? []

  // Build share count map: documentId → count
  let shareCountMap: Record<string, number> = {}
  if (owned.length > 0) {
    const { data: shareCounts } = await supabase
      .from('document_shares')
      .select('document_id')
      .in('document_id', owned.map(d => d.id))

    if (shareCounts) {
      shareCounts.forEach(row => {
        shareCountMap[row.document_id] = (shareCountMap[row.document_id] ?? 0) + 1
      })
    }
  }

  const shared = (sharedResult.data ?? [])
    .filter(s => s.document)
    .map(s => ({ ...(s.document as Record<string, unknown>), permission: s.permission }))

  return (
    <DashboardClient
      initialOwned={owned}
      initialShared={shared as never}
      shareCountMap={shareCountMap}
      userEmail={user.email ?? ''}
      userId={user.id}
    />
  )
}
