'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect } from 'react'
import Toolbar from './Toolbar'

interface RichTextEditorProps {
  content: Record<string, unknown>
  onUpdate: (json: Record<string, unknown>) => void
  editable?: boolean
}

export default function RichTextEditor({ content, onUpdate, editable = true }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Start writing your document…' }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onUpdate(editor.getJSON() as Record<string, unknown>)
    },
    editorProps: {
      attributes: {
        class: 'focus:outline-none',
      },
    },
    immediatelyRender: false,
  })

  // Sync content when it changes externally (e.g. file import)
  useEffect(() => {
    if (editor && content && JSON.stringify(editor.getJSON()) !== JSON.stringify(content)) {
      editor.commands.setContent(content)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  return (
    <div className="flex flex-col h-full">
      {editable && <Toolbar editor={editor} />}
      <div className="flex-1 overflow-auto bg-gray-100 py-8">
        <div className="max-w-3xl mx-auto bg-white shadow-sm rounded-sm min-h-[900px] px-16 py-12">
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
