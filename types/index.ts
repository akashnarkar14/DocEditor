export interface Profile {
  id: string
  email: string
  full_name: string | null
  created_at: string
}

export interface Document {
  id: string
  title: string
  content: Record<string, unknown>
  owner_id: string
  created_at: string
  updated_at: string
  owner?: Profile
  permission?: 'view' | 'edit'
}

export interface DocumentShare {
  id: string
  document_id: string
  shared_with_id: string
  permission: 'view' | 'edit'
  created_at: string
  shared_with?: Profile
}

export interface TipTapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TipTapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}

export interface TipTapDocument {
  type: 'doc'
  content: TipTapNode[]
}
