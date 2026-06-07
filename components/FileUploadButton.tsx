'use client'

import { useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Loader2, CheckCircle, X, FileText } from 'lucide-react'

const ACCEPTED = ['.txt', '.md']

export default function FileUploadButton() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<'idle' | 'loading' | 'error'>('idle')
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [dragging, setDragging] = useState(false)

  async function upload(file: File) {
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!ACCEPTED.includes(ext)) {
      setError(`"${file.name}" is not supported. Use .txt or .md files.`)
      setState('error')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('File too large. Maximum size is 5 MB.')
      setState('error')
      return
    }
    setFileName(file.name)
    setState('loading')
    setError('')
    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: formData })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error ?? 'Upload failed. Please try again.')
      setState('error')
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    router.push(`/document/${data.documentId}`)
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function reset() {
    setState('idle')
    setError('')
    setFileName('')
    if (inputRef.current) inputRef.current.value = ''
  }

  return (
    <div className="flex-1">
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onClick={() => state !== 'loading' && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 w-full h-full min-h-[110px] border-2 border-dashed rounded-xl transition-all
          ${state === 'loading'
            ? 'border-blue-300 bg-blue-50/40 cursor-default'
            : state === 'error'
            ? 'border-red-300 bg-red-50/40 cursor-pointer'
            : dragging
            ? 'border-blue-400 bg-blue-50 scale-[1.01] cursor-copy'
            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30 cursor-pointer'
          }
        `}
      >
        {state === 'loading' && (
          <>
            <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
            <p className="text-sm font-medium text-blue-600">Importing {fileName}…</p>
          </>
        )}

        {state === 'error' && (
          <>
            <div className="flex items-center gap-2 text-red-500">
              <FileText className="w-5 h-5" />
              <p className="text-sm font-medium">Upload failed</p>
            </div>
            <p className="text-xs text-red-400 text-center px-4">{error}</p>
            <button
              onClick={e => { e.stopPropagation(); reset() }}
              className="mt-1 flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-full"
            >
              <X className="w-3 h-3" /> Try again
            </button>
          </>
        )}

        {state === 'idle' && (
          <>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
              ${dragging ? 'bg-blue-100' : 'bg-gray-100'}
            `}>
              <Upload className={`w-5 h-5 transition-colors ${dragging ? 'text-blue-500' : 'text-gray-400'}`} />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700">
                {dragging ? 'Drop to import' : 'Drop file here'}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                or <span className="text-blue-600 font-medium">browse</span> · .txt or .md · max 5 MB
              </p>
            </div>
          </>
        )}

        <input ref={inputRef} type="file" accept=".txt,.md" onChange={handleInputChange} className="hidden" />
      </div>
    </div>
  )
}
