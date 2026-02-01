"use client"

import { useMemo } from 'react'

// Simple markdown parser - no heavy dependencies
export default function MarkdownRenderer({ content }) {
  const html = useMemo(() => {
    if (!content) return ''
    return parseMarkdown(content)
  }, [content])

  return (
    <div
      className="markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function parseMarkdown(text) {
  // Normalize line endings
  let normalized = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

  // Extract code blocks first to protect them from other parsing
  const codeBlocks = []
  normalized = normalized.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `__CODE_BLOCK_${codeBlocks.length}__`

    // Special handling for thinking blocks
    if (lang === 'thinking') {
      const thinkingHtml = `<details class="thinking-block"><summary>View thinking process</summary><div class="thinking-content">${escapeHtml(code.trim())}</div></details>`
      codeBlocks.push(thinkingHtml)
    } else {
      const highlighted = highlightCode(code.trim(), lang)
      codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${highlighted}</code></pre>`)
    }
    return placeholder
  })

  // Extract inline code
  const inlineCodes = []
  normalized = normalized.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `__INLINE_CODE_${inlineCodes.length}__`
    inlineCodes.push(`<code>${escapeHtml(code)}</code>`)
    return placeholder
  })

  // Now escape HTML in the remaining text
  let html = escapeHtml(normalized)

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic (order matters)
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/(?<!_)_([^_]+)_(?!_)/g, '<em>$1</em>')

  // Strikethrough
  html = html.replace(/~~(.+?)~~/g, '<del>$1</del>')

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

  // Blockquotes
  html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>')

  // Horizontal rules
  html = html.replace(/^---$/gm, '<hr>')
  html = html.replace(/^\*\*\*$/gm, '<hr>')

  // Unordered lists
  html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>')
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => `<ul>${match}</ul>`)

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Tables
  html = parseTable(html)

  // Line breaks - convert double newlines to paragraph breaks
  html = html.replace(/\n\n+/g, '</p><p>')

  // Single newlines to <br> within paragraphs (but not after block elements)
  html = html.replace(/(?<!>)\n(?!<)/g, '<br>\n')

  // Wrap in paragraph if not starting with block element
  if (!html.match(/^<(h[1-6]|ul|ol|pre|blockquote|table|hr|p)/)) {
    html = `<p>${html}</p>`
  }

  // Clean up empty paragraphs
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/<p><\/p>/g, '')

  // Restore code blocks
  codeBlocks.forEach((block, i) => {
    html = html.replace(`__CODE_BLOCK_${i}__`, block)
  })

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    html = html.replace(`__INLINE_CODE_${i}__`, code)
  })

  return html
}

function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }
  return text.replace(/[&<>"']/g, m => map[m])
}

function highlightCode(code, lang) {
  // First escape HTML in the code
  let highlighted = escapeHtml(code)

  // Comments (single line) - must match the escaped versions
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="code-comment">$1</span>')

  // Multi-line comments
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')

  // Strings (double and single quotes - escaped versions)
  highlighted = highlighted.replace(/(&quot;[^&]*?&quot;|&#039;[^&]*?&#039;)/g, '<span class="code-string">$1</span>')

  // Keywords (common across languages)
  const keywords = [
    'function', 'const', 'let', 'var', 'if', 'else', 'for', 'while', 'return',
    'import', 'export', 'from', 'default', 'class', 'extends', 'new', 'this',
    'async', 'await', 'try', 'catch', 'throw', 'finally', 'typeof', 'instanceof',
    'true', 'false', 'null', 'undefined', 'void', 'delete', 'in', 'of',
    'def', 'elif', 'lambda', 'pass', 'raise', 'with', 'as', 'yield', 'None', 'True', 'False',
    'fn', 'mut', 'impl', 'trait', 'struct', 'enum', 'match', 'pub', 'use', 'mod',
    'func', 'package', 'type', 'interface', 'map', 'range', 'go', 'defer', 'chan',
  ]
  const keywordRegex = new RegExp(`\\b(${keywords.join('|')})\\b`, 'g')
  highlighted = highlighted.replace(keywordRegex, '<span class="code-keyword">$1</span>')

  // Numbers
  highlighted = highlighted.replace(/\b(\d+\.?\d*)\b/g, '<span class="code-number">$1</span>')

  // Function calls
  highlighted = highlighted.replace(/\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, '<span class="code-function">$1</span>(')

  return highlighted
}

function parseTable(html) {
  const lines = html.split('\n')
  let inTable = false
  let tableHtml = ''
  let result = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const isTableRow = /^\|(.+)\|$/.test(line.trim())
    const isSeparator = /^\|[\s\-:|]+\|$/.test(line.trim())

    if (isTableRow && !isSeparator) {
      if (!inTable) {
        inTable = true
        tableHtml = '<table>'
      }

      const cells = line.trim().slice(1, -1).split('|').map(c => c.trim())
      const isHeader = i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1]?.trim())

      if (isHeader) {
        tableHtml += '<thead><tr>' + cells.map(c => `<th>${c}</th>`).join('') + '</tr></thead><tbody>'
      } else if (inTable) {
        tableHtml += '<tr>' + cells.map(c => `<td>${c}</td>`).join('') + '</tr>'
      }
    } else if (isSeparator) {
      continue
    } else {
      if (inTable) {
        tableHtml += '</tbody></table>'
        result.push(tableHtml)
        tableHtml = ''
        inTable = false
      }
      result.push(line)
    }
  }

  if (inTable) {
    tableHtml += '</tbody></table>'
    result.push(tableHtml)
  }

  return result.join('\n')
}
