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
  let html = escapeHtml(text)

  // Code blocks (must be first to prevent other parsing inside)
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const highlighted = highlightCode(code.trim(), lang)
    return `<pre><code class="language-${lang || 'text'}">${highlighted}</code></pre>`
  })

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')

  // Headers
  html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>')
  html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>')
  html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>')

  // Bold and italic
  html = html.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/___(.+?)___/g, '<strong><em>$1</em></strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/_(.+?)_/g, '<em>$1</em>')

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
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>')

  // Tables
  html = parseTable(html)

  // Paragraphs (wrap loose text)
  html = html.replace(/^(?!<[a-z])(.*[^\s].*)$/gm, (match) => {
    // Don't wrap if it's already an HTML element or empty
    if (match.startsWith('<') || match.trim() === '') return match
    return `<p>${match}</p>`
  })

  // Clean up empty paragraphs and extra whitespace
  html = html.replace(/<p>\s*<\/p>/g, '')
  html = html.replace(/\n{3,}/g, '\n\n')

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
  // Basic syntax highlighting
  let highlighted = code

  // Comments (single line)
  highlighted = highlighted.replace(/(\/\/.*$|#.*$)/gm, '<span class="code-comment">$1</span>')

  // Multi-line comments
  highlighted = highlighted.replace(/(\/\*[\s\S]*?\*\/)/g, '<span class="code-comment">$1</span>')

  // Strings
  highlighted = highlighted.replace(/(&quot;[^&]*&quot;|&#039;[^&]*&#039;)/g, '<span class="code-string">$1</span>')

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
  // Simple table parsing
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
      // Skip separator row
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
