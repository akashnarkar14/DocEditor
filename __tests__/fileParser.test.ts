import { describe, it, expect } from 'vitest'
import { textToTipTapContent, mdToTipTapContent, parseFileToTipTap } from '../lib/fileParser'

describe('textToTipTapContent', () => {
  it('returns a single empty paragraph for empty input', () => {
    const result = textToTipTapContent('')
    expect(result.type).toBe('doc')
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('paragraph')
  })

  it('treats the first single-line block as a H1 title', () => {
    const result = textToTipTapContent('My Document Title')
    expect(result.content[0].type).toBe('heading')
    expect(result.content[0].attrs?.level).toBe(1)
    expect(result.content[0].content?.[0].text).toBe('My Document Title')
  })

  it('treats single lines ending with ":" as H2 section headings', () => {
    const result = textToTipTapContent('Introduction\n\nSection one:\n\nSome text here.')
    const h2 = result.content.find(n => n.type === 'heading' && n.attrs?.level === 2)
    expect(h2).toBeDefined()
    expect(h2?.content?.[0].text).toBe('Section one:')
  })

  it('joins consecutive lines in the same block with hard breaks', () => {
    const result = textToTipTapContent('Title\n\nLine A\nLine B\nLine C')
    const para = result.content.find(n => n.type === 'paragraph')
    expect(para).toBeDefined()
    // text nodes + hardBreak nodes interleaved
    const texts = para?.content?.filter(n => n.type === 'text').map(n => n.text)
    expect(texts).toContain('Line A')
    expect(texts).toContain('Line B')
    expect(texts).toContain('Line C')
    const breaks = para?.content?.filter(n => n.type === 'hardBreak')
    expect(breaks?.length).toBe(2)
  })

  it('separates blocks on blank lines', () => {
    const result = textToTipTapContent('Title\n\nParagraph one.\n\nParagraph two.')
    // H1 + 2 paragraphs = 3 nodes
    expect(result.content.length).toBe(3)
  })

  it('handles whitespace-only input', () => {
    const result = textToTipTapContent('   \n\n  ')
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('paragraph')
  })
})

describe('mdToTipTapContent', () => {
  it('converts # heading to h1 node', () => {
    const result = mdToTipTapContent('# My Title')
    expect(result.content[0].type).toBe('heading')
    expect(result.content[0].attrs?.level).toBe(1)
    expect(result.content[0].content?.[0].text).toBe('My Title')
  })

  it('converts ## heading to h2', () => {
    const result = mdToTipTapContent('## Sub-heading')
    expect(result.content[0].attrs?.level).toBe(2)
  })

  it('converts ### heading to h3', () => {
    const result = mdToTipTapContent('### Section')
    expect(result.content[0].attrs?.level).toBe(3)
  })

  it('groups consecutive bullet lines into a bulletList node', () => {
    const result = mdToTipTapContent('- Alpha\n- Beta\n- Gamma')
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('bulletList')
    expect(result.content[0].content).toHaveLength(3)
  })

  it('groups consecutive ordered list lines into an orderedList node', () => {
    const result = mdToTipTapContent('1. First\n2. Second')
    expect(result.content[0].type).toBe('orderedList')
    expect(result.content[0].content).toHaveLength(2)
  })

  it('treats plain lines as paragraphs', () => {
    const result = mdToTipTapContent('Just a paragraph')
    expect(result.content[0].type).toBe('paragraph')
  })

  it('strips bold markdown markers from plain paragraphs', () => {
    const result = mdToTipTapContent('Hello **world**')
    expect(result.content[0].content?.[0].text).toBe('Hello world')
  })

  it('handles mixed content correctly', () => {
    const md = '# Title\n\nSome text\n\n- item 1\n- item 2'
    const result = mdToTipTapContent(md)
    expect(result.content[0].type).toBe('heading')
    expect(result.content[2].type).toBe('paragraph') // "Some text"
    expect(result.content[4].type).toBe('bulletList')
  })

  it('returns empty paragraph for empty input', () => {
    const result = mdToTipTapContent('')
    expect(result.content).toHaveLength(1)
    expect(result.content[0].type).toBe('paragraph')
  })
})

describe('parseFileToTipTap', () => {
  it('routes .md files through the markdown parser', () => {
    const result = parseFileToTipTap('notes.md', '# Hello')
    expect(result.content[0].type).toBe('heading')
  })

  it('routes .txt files through the plain-text parser (first line becomes H1)', () => {
    const result = parseFileToTipTap('notes.txt', 'My Title')
    expect(result.content[0].type).toBe('heading')
    expect(result.content[0].attrs?.level).toBe(1)
  })

  it('defaults unknown extensions to plain-text parser', () => {
    const result = parseFileToTipTap('notes.csv', 'a,b,c')
    expect(result.content[0].type).toBe('heading') // first line = title
  })
})
