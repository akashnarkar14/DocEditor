'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Share2, CheckCircle, Loader2, FileUp, AlertCircle, FileText } from 'lucide-react'
import RichTextEditor from './RichTextEditor'
import ShareDialog from '@/components/ShareDialog'
import type { Document, DocumentShare } from '@/types'

interface EditorPageProps {
  document: Document & { shares?: DocumentShare[] }
  userId: string
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export default function EditorPage({ document: initialDoc, userId }: EditorPageProps) {
  const router = useRouter()
  const [doc, setDoc] = useState(initialDoc)
  const [title, setTitle] = useState(initialDoc.title)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved')
  const [shareOpen, setShareOpen] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [importing, setImporting] = useState(false)

  const docIdRef = useRef(initialDoc.id)
  const pendingPatch = useRef<{ title?: string; content?: Record<string, unknown> }>({})
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isSaving = useRef(false)
  const saveStatusRef = useRef<SaveStatus>('saved')

  const isOwner = doc.owner_id === userId
  const canEdit = isOwner || doc.permission === 'edit'

  function updateSaveStatus(s: SaveStatus) {
    saveStatusRef.current = s
    setSaveStatus(s)
  }

  async function doSave() {
    const patch = { ...pendingPatch.current }
    if (Object.keys(patch).length === 0) return
    if (isSaving.current) {
      saveTimer.current = setTimeout(doSave, 600)
      return
    }
    isSaving.current = true
    pendingPatch.current = {}
    updateSaveStatus('saving')
    try {
      const res = await fetch(`/api/documents/${docIdRef.current}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (res.ok) {
        if (Object.keys(pendingPatch.current).length === 0) updateSaveStatus('saved')
      } else {
        pendingPatch.current = { ...patch, ...pendingPatch.current }
        updateSaveStatus('error')
      }
    } catch {
      pendingPatch.current = { ...patch, ...pendingPatch.current }
      updateSaveStatus('error')
    } finally {
      isSaving.current = false
    }
  }

  function scheduleSave(patch: { title?: string; content?: Record<string, unknown> }) {
    pendingPatch.current = { ...pendingPatch.current, ...patch }
    updateSaveStatus('unsaved')
    if (saveTimer.current) clearTimeout(saveTimer.current)
    saveTimer.current = setTimeout(doSave, 1000)
  }

  async function handleBack() {
    if (saveTimer.current) clearTimeout(saveTimer.current)
    await doSave()
    router.push('/dashboard')
    router.refresh()
  }

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (saveStatusRef.current === 'unsaved' || saveStatusRef.current === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload)
      if (saveTimer.current) clearTimeout(saveTimer.current)
    }
  }, [])

  function handleTitleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const newTitle = e.target.value
    setTitle(newTitle)
    scheduleSave({ title: newTitle })
  }

  function handleTitleBlur() {
    const trimmed = title.trim() || 'Untitled Document'
    if (trimmed !== title) setTitle(trimmed)
    scheduleSave({ title: trimmed })
  }

  function handleContentUpdate(json: Record<string, unknown>) {
    scheduleSave({ content: json })
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!['.txt', '.md'].includes(ext)) {
      setUploadError('Only .txt and .md files are supported.')
      e.target.value = ''
      return
    }
    setUploadError('')
    setImporting(true)
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    setImporting(false)
    if (!res.ok) {
      setUploadError(data.error ?? 'Upload failed')
      e.target.value = ''
      return
    }
    router.push(`/document/${data.documentId}`)
  }

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Header */}
      <header className="flex items-center justify-between px-4 bg-white border-b border-gray-200 gap-4 shrink-0 h-13">
        {/* Left: back + logo + title */}
        <div className="flex items-center gap-2 min-w-0 py-2.5">
          <button
            onClick={handleBack}
            title="Save and go back"
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-800 transition-colors shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-1.5 shrink-0">
            <div className="w-6 h-6 bg-blue-600 rounded-md flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-xs text-gray-400 font-medium hidden sm:block">Ajaia Docs</span>
          </div>

          <span className="text-gray-300 shrink-0">/</span>

          <input
            value={title}
            onChange={handleTitleChange}
            onBlur={handleTitleBlur}
            disabled={!isOwner}
            placeholder="Untitled Document"
            className="text-sm font-semibold text-gray-800 bg-transparent border-none outline-none min-w-0 disabled:cursor-default placeholder:text-gray-300 hover:bg-gray-50 focus:bg-gray-50 px-1.5 py-0.5 rounded-lg transition-colors"
            style={{ width: `${Math.max(title.length, 18)}ch` }}
          />
        </div>

        {/* Right: status + actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Save status */}
          <span className="text-xs flex items-center gap-1.5 min-w-[72px] justify-end">
            {saveStatus === 'saving' && (
              <span className="text-gray-400 flex items-center gap-1.5">
                <Loader2 className="w-3 h-3 animate-spin" /> Saving…
              </span>
            )}
            {saveStatus === 'saved' && (
              <span className="text-emerald-600 flex items-center gap-1.5">
                <CheckCircle className="w-3 h-3" /> Saved
              </span>
            )}
            {saveStatus === 'unsaved' && (
              <span className="text-amber-500">Unsaved</span>
            )}
            {saveStatus === 'error' && (
              <button
                onClick={doSave}
                className="flex items-center gap-1 text-red-500 hover:text-red-700 transition-colors"
              >
                <AlertCircle className="w-3 h-3" /> Retry
              </button>
            )}
          </span>

          <div className="h-4 w-px bg-gray-200" />

          {/* Import */}
          <label
            title="Import .txt or .md as new document"
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-colors
              ${importing ? 'opacity-50 pointer-events-none' : ''}
            `}
          >
            {importing ? <Loader2 className="w-3 h-3 animate-spin" /> : <FileUp className="w-3 h-3" />}
            <span className="hidden sm:block">{importing ? 'Importing…' : 'Import'}</span>
            <input type="file" accept=".txt,.md" onChange={handleFileImport} className="hidden" />
          </label>

          {/* Share */}
          {isOwner && (
            <button
              onClick={() => setShareOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm shadow-blue-100"
            >
              <Share2 className="w-3 h-3" />
              Share
            </button>
          )}

          {!isOwner && (
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full
              ${doc.permission === 'view'
                ? 'bg-gray-100 text-gray-500'
                : 'bg-emerald-100 text-emerald-700'}
            `}>
              {doc.permission === 'view' ? 'View only' : 'Editor'}
            </span>
          )}
        </div>
      </header>

      {/* Upload error */}
      {uploadError && (
        <div className="px-4 py-2.5 bg-red-50 border-b border-red-100 text-sm text-red-600 flex items-center justify-between">
          <span className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            {uploadError}
          </span>
          <button onClick={() => setUploadError('')} className="text-xs underline ml-4 text-red-400 hover:text-red-600">
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <RichTextEditor
          content={doc.content}
          onUpdate={handleContentUpdate}
          editable={canEdit}
        />
      </div>

      {shareOpen && (
        <ShareDialog
          documentId={doc.id}
          shares={doc.shares ?? []}
          onClose={() => setShareOpen(false)}
          onSharesChange={shares => setDoc(d => ({ ...d, shares }))}
        />
      )}
    </div>
  )
}
