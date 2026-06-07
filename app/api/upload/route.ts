import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { parseFileToTipTap } from '@/lib/fileParser'

const ALLOWED_TYPES = ['.txt', '.md']
const MAX_SIZE_BYTES = 5 * 1024 * 1024 // 5MB

export async function POST(request: NextRequest) {
  const supabase = createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const formData = await request.formData().catch(() => null)
  if (!formData) {
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 })
  }

  const file = formData.get('file') as File | null
  if (!file) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  // Validate file type
  const filename = file.name.toLowerCase()
  const ext = '.' + filename.split('.').pop()
  if (!ALLOWED_TYPES.includes(ext)) {
    return NextResponse.json(
      { error: `Unsupported file type. Only ${ALLOWED_TYPES.join(', ')} files are supported.` },
      { status: 415 }
    )
  }

  // Validate file size
  if (file.size > MAX_SIZE_BYTES) {
    return NextResponse.json({ error: 'File too large. Maximum size is 5MB.' }, { status: 413 })
  }

  const text = await file.text()
  const content = parseFileToTipTap(file.name, text)

  // Use original filename (without extension) as document title
  const title = file.name.replace(/\.(txt|md)$/i, '') || 'Imported Document'

  const { data, error } = await supabase
    .from('documents')
    .insert({ title, content, owner_id: user.id })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ documentId: data.id, title: data.title }, { status: 201 })
}
