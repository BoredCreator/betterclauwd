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

  // Extract and render LaTeX math expressions first
  const mathBlocks = []

  // Display math: $$ ... $$
  normalized = normalized.replace(/\$\$([\s\S]*?)\$\$/g, (match, math) => {
    const placeholder = `%%MATHBLOCK${mathBlocks.length}%%`
    const rendered = renderLatex(math.trim())
    mathBlocks.push(`<div class="math-block">${rendered}</div>`)
    return placeholder
  })

  // Inline math: $ ... $
  normalized = normalized.replace(/\$([^\$\n]+?)\$/g, (match, math) => {
    const placeholder = `%%MATHBLOCK${mathBlocks.length}%%`
    const rendered = renderLatex(math.trim())
    mathBlocks.push(`<span class="math-inline">${rendered}</span>`)
    return placeholder
  })

  // Handle bare LaTeX commands outside of $ delimiters
  // Detect lines/segments containing \frac, \dfrac, \sqrt, \boxed, \int, \sec, etc.
  const latexCmdPattern = /\\(?:d?frac|sqrt|boxed|int|sin|cos|tan|sec|csc|cot|arcsin|arccos|arctan|log|ln|lim|sum|prod|infty|alpha|beta|gamma|delta|epsilon|theta|lambda|mu|pi|sigma|phi|psi|omega|times|cdot|pm|leq|geq|neq|approx|left|right)\b/
  normalized = normalized.split('\n').map(line => {
    // Skip lines that already have math placeholders or are code blocks
    if (line.includes('%%MATHBLOCK') || line.includes('%%CODEBLOCK') || line.startsWith('```')) {
      return line
    }
    // If line contains bare LaTeX commands, render them inline
    if (latexCmdPattern.test(line)) {
      // Render the LaTeX parts of the line
      return renderLatex(line)
    }
    return line
  }).join('\n')

  // Extract code blocks first to protect them from other parsing
  // Use %%CODEBLOCK%% format to avoid markdown bold/italic patterns matching
  const codeBlocks = []
  normalized = normalized.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const placeholder = `%%CODEBLOCK${codeBlocks.length}%%`

    // Special handling for thinking blocks
    if (lang === 'thinking') {
      const thinkingHtml = `<details class="thinking-block" open><summary></summary><div class="thinking-content">${escapeHtml(code.trim())}</div></details>`
      codeBlocks.push(thinkingHtml)
    } else {
      const highlighted = highlightCode(code.trim(), lang)
      codeBlocks.push(`<pre><code class="language-${lang || 'text'}">${highlighted}</code></pre>`)
    }
    return placeholder
  })

  // Handle incomplete code blocks (still streaming) - any language
  normalized = normalized.replace(/```(\w*)\n([\s\S]*)$/, (match, lang, code) => {
    const placeholder = `%%CODEBLOCK${codeBlocks.length}%%`

    if (lang === 'thinking') {
      const thinkingHtml = `<details class="thinking-block thinking-streaming" open><summary></summary><div class="thinking-content">${escapeHtml(code.trim())}</div></details>`
      codeBlocks.push(thinkingHtml)
    } else {
      const highlighted = highlightCode(code.trim(), lang)
      codeBlocks.push(`<pre class="streaming"><code class="language-${lang || 'text'}">${highlighted}</code></pre>`)
    }
    return placeholder
  })

  // Extract inline code
  const inlineCodes = []
  normalized = normalized.replace(/`([^`]+)`/g, (match, code) => {
    const placeholder = `%%INLINECODE${inlineCodes.length}%%`
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
    html = html.replace(`%%CODEBLOCK${i}%%`, block)
  })

  // Restore inline code
  inlineCodes.forEach((code, i) => {
    html = html.replace(`%%INLINECODE${i}%%`, code)
  })

  // Restore math blocks
  mathBlocks.forEach((math, i) => {
    html = html.replace(`%%MATHBLOCK${i}%%`, math)
  })

  return html
}

function renderLatex(latex) {
  // Simple LaTeX to HTML converter for common math notation
  let html = latex

  // Helper function to extract content within matching braces
  const extractBraced = (str, startIndex) => {
    let depth = 0
    let content = ''
    for (let i = startIndex; i < str.length; i++) {
      if (str[i] === '{') {
        if (depth > 0) content += '{'
        depth++
      } else if (str[i] === '}') {
        depth--
        if (depth === 0) return { content, endIndex: i }
        content += '}'
      } else if (depth > 0) {
        content += str[i]
      }
    }
    return { content, endIndex: str.length }
  }

  // Handle \boxed{} with nested braces
  let pos = 0
  while ((pos = html.indexOf('\\boxed{', pos)) !== -1) {
    const { content, endIndex } = extractBraced(html, pos + 6) // start AT the '{'
    if (endIndex < html.length) {
      const rendered = `<span class="math-boxed">${content}</span>`
      html = html.substring(0, pos) + rendered + html.substring(endIndex + 1)
      pos += rendered.length
    } else {
      pos++
    }
  }

  // Handle \dfrac and \frac with nested braces
  const handleFrac = (cmd) => {
    let pos = 0
    while ((pos = html.indexOf(cmd, pos)) !== -1) {
      const startPos = pos + cmd.length // points to the '{' after \frac
      if (html[startPos] !== '{') { pos++; continue }
      const first = extractBraced(html, startPos) // start AT the '{'
      if (first.endIndex < html.length) {
        const nextPos = first.endIndex + 1
        if (nextPos < html.length && html[nextPos] === '{') {
          const second = extractBraced(html, nextPos) // start AT the second '{'
          if (second.endIndex < html.length) {
            const rendered = `<span class="math-frac"><span class="math-frac-num">${first.content}</span><span class="math-frac-den">${second.content}</span></span>`
            html = html.substring(0, pos) + rendered + html.substring(second.endIndex + 1)
            pos += rendered.length
            continue
          }
        }
      }
      pos++
    }
  }

  handleFrac('\\dfrac')
  handleFrac('\\frac')

  // Square root: \sqrt{x} or \sqrt[n]{x} with nested braces
  pos = 0
  while ((pos = html.indexOf('\\sqrt', pos)) !== -1) {
    let startPos = pos + 5
    let index = null

    // Check for optional index [n]
    if (html[startPos] === '[') {
      const closeBracket = html.indexOf(']', startPos)
      if (closeBracket !== -1) {
        index = html.substring(startPos + 1, closeBracket)
        startPos = closeBracket + 1
      }
    }

    if (html[startPos] === '{') {
      const { content, endIndex } = extractBraced(html, startPos) // start AT the '{'
      let rendered
      if (index) {
        rendered = `<span class="math-root"><sup class="math-root-index">${index}</sup>√<span class="math-root-content">${content}</span></span>`
      } else {
        rendered = `√<span class="math-root-content">${content}</span>`
      }
      html = html.substring(0, pos) + rendered + html.substring(endIndex + 1)
      pos += rendered.length
    } else {
      pos++
    }
  }

  // Integrals: \int
  html = html.replace(/\\int/g, '∫')

  // Limits: \lim
  html = html.replace(/\\lim/g, 'lim')

  // Sum: \sum
  html = html.replace(/\\sum/g, '∑')

  // Product: \prod
  html = html.replace(/\\prod/g, '∏')

  // Infinity: \infty
  html = html.replace(/\\infty/g, '∞')

  // Pi, theta, etc: common Greek letters
  const greekLetters = {
    'alpha': 'α', 'beta': 'β', 'gamma': 'γ', 'delta': 'δ', 'epsilon': 'ε',
    'zeta': 'ζ', 'eta': 'η', 'theta': 'θ', 'iota': 'ι', 'kappa': 'κ',
    'lambda': 'λ', 'mu': 'μ', 'nu': 'ν', 'xi': 'ξ', 'pi': 'π',
    'rho': 'ρ', 'sigma': 'σ', 'tau': 'τ', 'phi': 'φ', 'chi': 'χ',
    'psi': 'ψ', 'omega': 'ω',
    'Gamma': 'Γ', 'Delta': 'Δ', 'Theta': 'Θ', 'Lambda': 'Λ', 'Xi': 'Ξ',
    'Pi': 'Π', 'Sigma': 'Σ', 'Phi': 'Φ', 'Psi': 'Ψ', 'Omega': 'Ω'
  }

  for (const [latex, symbol] of Object.entries(greekLetters)) {
    html = html.replace(new RegExp(`\\\\${latex}\\b`, 'g'), symbol)
  }

  // Superscripts: ^{...} or ^x
  html = html.replace(/\^\{([^}]+)\}/g, '<sup>$1</sup>')
  html = html.replace(/\^(\w)/g, '<sup>$1</sup>')

  // Subscripts: _{...} or _x
  html = html.replace(/_\{([^}]+)\}/g, '<sub>$1</sub>')
  html = html.replace(/_(\w)/g, '<sub>$1</sub>')

  // \text{} - render as plain text
  html = html.replace(/\\text\{([^}]+)\}/g, '$1')

  // Common trig/math functions
  html = html.replace(/\\sin\b/g, 'sin')
  html = html.replace(/\\cos\b/g, 'cos')
  html = html.replace(/\\tan\b/g, 'tan')
  html = html.replace(/\\sec\b/g, 'sec')
  html = html.replace(/\\csc\b/g, 'csc')
  html = html.replace(/\\cot\b/g, 'cot')
  html = html.replace(/\\arcsin\b/g, 'arcsin')
  html = html.replace(/\\arccos\b/g, 'arccos')
  html = html.replace(/\\arctan\b/g, 'arctan')
  html = html.replace(/\\log\b/g, 'log')
  html = html.replace(/\\ln\b/g, 'ln')
  html = html.replace(/\\exp\b/g, 'exp')

  // Operators
  html = html.replace(/\\times/g, '×')
  html = html.replace(/\\div/g, '÷')
  html = html.replace(/\\pm/g, '±')
  html = html.replace(/\\mp/g, '∓')
  html = html.replace(/\\cdot/g, '·')
  html = html.replace(/\\ldots/g, '…')
  html = html.replace(/\\dots/g, '…')

  // Relations
  html = html.replace(/\\leq/g, '≤')
  html = html.replace(/\\geq/g, '≥')
  html = html.replace(/\\neq/g, '≠')
  html = html.replace(/\\approx/g, '≈')
  html = html.replace(/\\equiv/g, '≡')

  // Arrows
  html = html.replace(/\\rightarrow/g, '→')
  html = html.replace(/\\leftarrow/g, '←')
  html = html.replace(/\\Rightarrow/g, '⇒')
  html = html.replace(/\\Leftarrow/g, '⇐')

  // Remove common LaTeX commands that don't need special rendering
  html = html.replace(/\\left/g, '')
  html = html.replace(/\\right/g, '')
  html = html.replace(/\\,/g, ' ')
  html = html.replace(/\\;/g, ' ')
  html = html.replace(/\\!/g, '')
  html = html.replace(/\\quad/g, ' ')
  html = html.replace(/\\qquad/g, '  ')
  html = html.replace(/\\displaystyle/g, '')
  html = html.replace(/\\mathrm\{([^}]+)\}/g, '$1')
  html = html.replace(/\\mathbf\{([^}]+)\}/g, '<strong>$1</strong>')

  // Clean up remaining lone braces that were part of LaTeX grouping
  html = html.replace(/(?<![%\w])\{([^}]+)\}/g, '$1')

  // Strip any remaining unknown backslash commands (e.g. \foo → foo)
  html = html.replace(/\\([a-zA-Z]+)/g, '$1')

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
  // For # comments, exclude C/C++ preprocessor directives
  highlighted = highlighted.replace(/(\/\/.*$)/gm, '<span class="code-comment">$1</span>')
  // Only treat # as comment for languages that use it (Python, Ruby, Shell, etc.)
  // Exclude C/C++ preprocessor directives like #include, #define, etc.
  if (!['c', 'cpp', 'c++', 'h', 'hpp', 'objc', 'objective-c'].includes(lang?.toLowerCase())) {
    highlighted = highlighted.replace(/^(\s*#(?!include|define|pragma|ifdef|ifndef|endif|else|elif|error|warning|undef|line).*)$/gm, '<span class="code-comment">$1</span>')
  }

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
