'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, MoreVertical, UserCheck, Eye, Edit3 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import type { Document } from '@/types'

interface DocumentCardProps {
  document: Document
  isOwner: boolean
  shareCount?: number
  onDelete?: (id: string) => void
}

export default function DocumentCard({ document: doc, isOwner, shareCount = 0, onDelete }: DocumentCardProps) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!confirm('Delete this document? This cannot be undone.')) return
    setDeleting(true)
    const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' })
    if (res.ok) onDelete?.(doc.id)
    else setDeleting(false)
  }

  const isViewOnly = !isOwner && doc.permission === 'view'

  // Color theme per card type
  const theme = isOwner
    ? { bg: 'from-blue-50 to-indigo-50', line1: 'bg-blue-200', line2: 'bg-blue-100', line3: 'bg-indigo-100' }
    : isViewOnly
    ? { bg: 'from-gray-50 to-slate-100', line1: 'bg-gray-200', line2: 'bg-gray-100', line3: 'bg-slate-100' }
    : { bg: 'from-emerald-50 to-teal-50', line1: 'bg-emerald-200', line2: 'bg-emerald-100', line3: 'bg-teal-100' }

  return (
    <div
      onClick={() => router.push(`/document/${doc.id}`)}
      className={`group relative bg-white border border-gray-200 rounded-xl overflow-hidden cursor-pointer transition-all duration-150
        ${deleting ? 'opacity-40 pointer-events-none scale-95' : 'hover:border-blue-300 hover:shadow-lg hover:shadow-blue-50 hover:-translate-y-0.5'}
      `}
    >
      {/* Document preview area */}
      <div className={`h-32 bg-gradient-to-br ${theme.bg} flex items-end px-4 pb-3 relative`}>
        {/* Fake document lines */}
        <div className="absolute inset-0 flex flex-col justify-center px-5 gap-1.5 pt-2">
          <div className={`h-2 rounded-full w-3/4 ${theme.line1} opacity-70`} />
          <div className={`h-1.5 rounded-full w-full ${theme.line2}`} />
          <div className={`h-1.5 rounded-full w-5/6 ${theme.line2}`} />
          <div className={`h-1.5 rounded-full w-4/5 ${theme.line3}`} />
          <div className={`h-1.5 rounded-full w-2/3 ${theme.line3}`} />
          <div className={`h-1.5 rounded-full w-3/4 ${theme.line2} opacity-60`} />
        </div>

        {/* Top-right badges */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1">
          {isOwner && shareCount > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-medium text-blue-700 bg-white/90 border border-blue-100 px-1.5 py-0.5 rounded-full">
              <UserCheck className="w-2.5 h-2.5" /> Shared
            </span>
          )}
          {!isOwner && (
            <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/90 border
              ${isViewOnly ? 'text-gray-600 border-gray-200' : 'text-emerald-700 border-emerald-100'}
            `}>
              {isViewOnly ? <><Eye className="w-2.5 h-2.5" /> View</> : <><Edit3 className="w-2.5 h-2.5" /> Edit</>}
            </span>
          )}

          {/* Kebab menu — owner only */}
          {isOwner && (
            <div className="relative" onClick={e => e.stopPropagation()}>
              <button
                onClick={e => { e.stopPropagation(); setMenuOpen(o => !o) }}
                className="p-0.5 rounded opacity-0 group-hover:opacity-100 hover:bg-white/70 transition-all"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-500" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[130px]">
                    <button
                      onClick={handleDelete}
                      className="flex items-center gap-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card footer */}
      <div className="px-3.5 py-3">
        <h3 className="font-semibold text-gray-900 text-sm truncate leading-tight mb-1">
          {doc.title}
        </h3>
        <p className="text-xs text-gray-400">{formatDate(doc.updated_at)}</p>
        {!isOwner && doc.owner && (
          <p className="text-xs text-gray-400 truncate mt-0.5">
            by {doc.owner.full_name || doc.owner.email}
          </p>
        )}
      </div>
    </div>
  )
}
