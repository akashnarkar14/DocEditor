'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, LogOut, Users, Loader2, FileText } from 'lucide-react'
import DocumentCard from '@/components/dashboard/DocumentCard'
import FileUploadButton from '@/components/FileUploadButton'
import type { Document } from '@/types'

interface DashboardClientProps {
  initialOwned: Document[]
  initialShared: Document[]
  shareCountMap: Record<string, number>
  userEmail: string
  userId: string
}

export default function DashboardClient({
  initialOwned,
  initialShared,
  shareCountMap,
  userEmail,
}: DashboardClientProps) {
  const router = useRouter()
  const [owned, setOwned] = useState<Document[]>(initialOwned)
  const [shared] = useState<Document[]>(initialShared)
  const [creating, setCreating] = useState(false)

  const initials = userEmail.charAt(0).toUpperCase()

  async function handleNewDocument() {
    setCreating(true)
    const res = await fetch('/api/documents', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: 'Untitled Document' }),
    })
    const data = await res.json()
    setCreating(false)
    if (res.ok) router.push(`/document/${data.id}`)
  }

  async function handleSignOut() {
    const { createClient } = await import('@/lib/supabase/client')
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function handleDelete(id: string) {
    setOwned(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-white" />
            </div>
            <span className="font-semibold text-gray-900 text-base">Ajaia Docs</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500 hidden sm:block">{userEmail}</span>
            <button
              onClick={handleSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:block">Sign out</span>
            </button>
            <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center select-none">
              {initials}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">

        {/* Action bar — New Doc + Upload Zone side by side */}
        <div className="flex gap-4 mb-10 h-[130px]">
          {/* New document card */}
          <button
            onClick={handleNewDocument}
            disabled={creating}
            className="flex flex-col items-center justify-center gap-2 w-48 shrink-0 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-sm shadow-blue-200"
          >
            {creating
              ? <Loader2 className="w-6 h-6 animate-spin" />
              : <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Plus className="w-5 h-5" />
                </div>
            }
            <span className="text-sm font-semibold">{creating ? 'Creating…' : 'New document'}</span>
          </button>

          {/* Upload zone */}
          <FileUploadButton />
        </div>

        {/* My Documents */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-gray-900">My Documents</h2>
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
                {owned.length}
              </span>
            </div>
          </div>

          {owned.length === 0 ? (
            <div
              onClick={handleNewDocument}
              className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-xl bg-gray-100 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                <FileText className="w-6 h-6 text-gray-300 group-hover:text-blue-400 transition-colors" />
              </div>
              <p className="text-sm font-medium text-gray-500 group-hover:text-blue-600 transition-colors">
                Create your first document
              </p>
              <p className="text-xs text-gray-400 mt-1">Click here or use the button above</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {owned.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isOwner={true}
                  shareCount={shareCountMap[doc.id] ?? 0}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        {/* Shared with Me */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4 h-4 text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Shared with Me</h2>
            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
              {shared.length}
            </span>
          </div>

          {shared.length === 0 ? (
            <div className="flex items-center gap-4 py-8 px-6 border border-dashed border-gray-200 rounded-xl bg-white">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-500">No shared documents yet</p>
                <p className="text-xs text-gray-400 mt-0.5">Documents shared with you will appear here.</p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {shared.map(doc => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  isOwner={false}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
