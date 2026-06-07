'use client'

import { useState, useEffect } from 'react'
import { X, Trash2, UserPlus, Users, Loader2 } from 'lucide-react'
import type { DocumentShare } from '@/types'

interface ShareDialogProps {
  documentId: string
  shares: DocumentShare[]
  onClose: () => void
  onSharesChange: (shares: DocumentShare[]) => void
}

export default function ShareDialog({
  documentId,
  shares: initialShares,
  onClose,
  onSharesChange,
}: ShareDialogProps) {
  const [shares, setShares] = useState<DocumentShare[]>(initialShares)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<'edit' | 'view'>('edit')
  const [loading, setLoading] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [removeError, setRemoveError] = useState('')
  const [success, setSuccess] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function handleShare(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')
    setRemoveError('')
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) { setError('Enter an email address.'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError('Enter a valid email address.')
      return
    }
    setLoading(true)
    const res = await fetch(`/api/documents/${documentId}/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: trimmed, permission }),
    })
    const data = await res.json()
    setLoading(false)
    if (!res.ok) {
      setError(data.error ?? 'Failed to share document.')
      return
    }
    const updated = shares.some(s => s.id === data.id)
      ? shares.map(s => (s.id === data.id ? data : s))
      : [...shares, data]
    setShares(updated)
    onSharesChange(updated)
    setEmail('')
    setSuccess(`Shared with ${trimmed}`)
  }

  async function handleRemove(shareId: string) {
    setRemoveError('')
    setRemovingId(shareId)
    const res = await fetch(`/api/documents/${documentId}/share`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ shareId }),
    })
    setRemovingId(null)
    if (!res.ok) {
      setRemoveError('Failed to remove access. Please try again.')
      return
    }
    const updated = shares.filter(s => s.id !== shareId)
    setShares(updated)
    onSharesChange(updated)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-gray-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-900 text-sm leading-tight">Share document</h2>
              <p className="text-xs text-gray-400 leading-tight">Invite people to view or edit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Invite form */}
          <form onSubmit={handleShare} className="space-y-3">
            <div className="flex gap-2">
              <input
                type="email"
                value={email}
                onChange={e => { setEmail(e.target.value); setError(''); setSuccess('') }}
                placeholder="colleague@example.com"
                className="flex-1 px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                autoFocus
              />
              <select
                value={permission}
                onChange={e => setPermission(e.target.value as 'edit' | 'view')}
                className="px-3 py-2 border border-gray-200 rounded-xl text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white transition-all"
              >
                <option value="edit">Can edit</option>
                <option value="view">Can view</option>
              </select>
            </div>

            {error && (
              <p className="text-xs text-red-500 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-red-400 shrink-0" />{error}
              </p>
            )}
            {success && (
              <p className="text-xs text-emerald-600 flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />✓ {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-xl hover:bg-blue-700 disabled:opacity-60 transition-colors shadow-sm shadow-blue-100"
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              {loading ? 'Sharing…' : 'Share'}
            </button>
          </form>

          {shares.length > 0 && (
            <>
              <div className="border-t border-gray-100" />
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                  People with access
                </p>

                {removeError && (
                  <p className="text-xs text-red-500 mb-2">{removeError}</p>
                )}

                <ul className="space-y-0.5">
                  {shares.map(share => (
                    <li
                      key={share.id}
                      className="flex items-center justify-between py-2 px-2 rounded-xl hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white text-xs font-bold flex items-center justify-center shrink-0 select-none">
                          {(share.shared_with?.full_name || share.shared_with?.email || '?').charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate leading-tight">
                            {share.shared_with?.full_name || share.shared_with?.email || '—'}
                          </p>
                          {share.shared_with?.full_name && (
                            <p className="text-xs text-gray-400 truncate">
                              {share.shared_with.email}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full
                          ${share.permission === 'view'
                            ? 'bg-gray-100 text-gray-500'
                            : 'bg-emerald-100 text-emerald-700'}
                        `}>
                          {share.permission === 'view' ? 'View' : 'Edit'}
                        </span>
                        <button
                          onClick={() => handleRemove(share.id)}
                          disabled={removingId === share.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors disabled:opacity-40"
                          title="Remove access"
                        >
                          {removingId === share.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <Trash2 className="w-3.5 h-3.5" />
                          }
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {shares.length === 0 && (
            <div className="text-center py-4 text-sm text-gray-400">
              Not shared with anyone yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
