import type { TipTapDocument, TipTapNode } from '@/types'

// Converts a plain .txt file to TipTap JSON with smart structure detection:
//  - First block (single line)    → H1 title
//  - Single line ending with ':'  → H2 section heading
//  - All other blocks             → paragraph (multiple lines joined with hard breaks)
export function textToTipTapContent(text: string): TipTapDocument {
  if (!text.trim()) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
  }

  // Split into blocks separated by one or more blank lines
  const rawBlocks = text.split(/\n[ \t]*\n/)
  const nodes: TipTapNode[] = []

  rawBlocks.forEach((block, blockIndex) => {
    const lines = block
      .split('\n')
      .map(l => l.trimEnd())
      .filter(l => l.trim() !== '')

    if (lines.length === 0) return

    const single = lines.length === 1 ? lines[0].trim() : null

    // First non-empty block, single line → document title (H1)
    if (blockIndex === 0 && single) {
      nodes.push({
        type: 'heading',
        attrs: { level: 1 },
        content: [{ type: 'text', text: single }],
      })
      return
    }

    // Single line ending with ':' → section heading (H2)
    if (single && single.endsWith(':')) {
      nodes.push({
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: single }],
      })
      return
    }

    // Everything else: paragraph — multiple lines joined with hard breaks
    const content: TipTapNode[] = []
    lines.forEach((line, idx) => {
      content.push({ type: 'text', text: line.trim() })
      if (idx < lines.length - 1) {
        content.push({ type: 'hardBreak' })
      }
    })
    nodes.push({ type: 'paragraph', content })
  })

  if (nodes.length === 0) {
    nodes.push({ type: 'paragraph', content: [] })
  }

  return { type: 'doc', content: nodes }
}

// Converts a .md file to TipTap JSON
export function mdToTipTapContent(md: string): TipTapDocument {
  if (!md.trim()) {
    return { type: 'doc', content: [{ type: 'paragraph', content: [] }] }
  }

  const lines = md.split('\n')
  const nodes: TipTapNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      nodes.push({ type: 'paragraph', content: [] })
      i++
      continue
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3 | 4 | 5 | 6
      nodes.push({
        type: 'heading',
        attrs: { level },
        content: [{ type: 'text', text: headingMatch[2] }],
      })
      i++
      continue
    }

    // Unordered list block
    if (/^[-*]\s+/.test(line)) {
      const listItems: TipTapNode[] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^[-*]\s+/, '')
        listItems.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: itemText }] }],
        })
        i++
      }
      nodes.push({ type: 'bulletList', content: listItems })
      continue
    }

    // Ordered list block
    if (/^\d+\.\s+/.test(line)) {
      const listItems: TipTapNode[] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        const itemText = lines[i].replace(/^\d+\.\s+/, '')
        listItems.push({
          type: 'listItem',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: itemText }] }],
        })
        i++
      }
      nodes.push({ type: 'orderedList', attrs: { start: 1 }, content: listItems })
      continue
    }

    // Plain paragraph (strip inline markdown: **bold**, *italic*, __u__, _i_)
    const cleanLine = line
      .replace(/\*\*(.+?)\*\*/g, '$1')
      .replace(/\*(.+?)\*/g, '$1')
      .replace(/__(.+?)__/g, '$1')
      .replace(/_(.+?)_/g, '$1')

    nodes.push({
      type: 'paragraph',
      content: [{ type: 'text', text: cleanLine }],
    })
    i++
  }

  return { type: 'doc', content: nodes }
}

export function parseFileToTipTap(filename: string, content: string): TipTapDocument {
  const ext = filename.split('.').pop()?.toLowerCase()
  if (ext === 'md') return mdToTipTapContent(content)
  return textToTipTapContent(content)
}
