"use client"

import { useMemo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkMath from 'remark-math'
import remarkGfm from 'remark-gfm'
import rehypeKatex from 'rehype-katex'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import 'katex/dist/katex.min.css'

export default function MarkdownRenderer({ content }) {
  // Pre-process content to handle thinking blocks and streaming code blocks
  const processed = useMemo(() => {
    if (!content) return ''

    let text = content

    // Convert ```thinking blocks to a special format we can detect
    // Replace completed thinking blocks
    text = text.replace(/```thinking\n([\s\S]*?)```/g, (match, thinking) => {
      return `%%%THINKING_BLOCK%%%${thinking.trim()}%%%END_THINKING%%%`
    })

    // Handle incomplete/streaming thinking blocks
    text = text.replace(/```thinking\n([\s\S]*)$/, (match, thinking) => {
      return `%%%THINKING_STREAMING%%%${thinking.trim()}%%%END_THINKING%%%`
    })

    return text
  }, [content])

  // Split content into thinking blocks and markdown segments
  const segments = useMemo(() => {
    const parts = []
    const thinkingRegex = /%%%(THINKING_BLOCK|THINKING_STREAMING)%%%([\s\S]*?)%%%END_THINKING%%%/g
    let lastIndex = 0
    let match

    while ((match = thinkingRegex.exec(processed)) !== null) {
      // Add markdown before this thinking block
      if (match.index > lastIndex) {
        parts.push({ type: 'markdown', content: processed.substring(lastIndex, match.index) })
      }
      parts.push({
        type: 'thinking',
        streaming: match[1] === 'THINKING_STREAMING',
        content: match[2],
      })
      lastIndex = match.index + match[0].length
    }

    // Add remaining markdown
    if (lastIndex < processed.length) {
      parts.push({ type: 'markdown', content: processed.substring(lastIndex) })
    }

    return parts
  }, [processed])

  return (
    <div className="markdown-content">
      {segments.map((segment, i) => {
        if (segment.type === 'thinking') {
          return (
            <details
              key={i}
              className={`thinking-block ${segment.streaming ? 'thinking-streaming' : ''}`}
              open
            >
              <summary></summary>
              <div className="thinking-content">{segment.content}</div>
            </details>
          )
        }

        return (
          <ReactMarkdown
            key={i}
            remarkPlugins={[remarkMath, remarkGfm]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '')
                if (!inline && match) {
                  return (
                    <SyntaxHighlighter
                      style={oneDark}
                      language={match[1]}
                      PreTag="div"
                      customStyle={{
                        margin: '0.5rem 0',
                        borderRadius: '4px',
                        fontSize: '13px',
                        border: '1px solid var(--border)',
                      }}
                      {...props}
                    >
                      {String(children).replace(/\n$/, '')}
                    </SyntaxHighlighter>
                  )
                }
                return (
                  <code className={className} {...props}>
                    {children}
                  </code>
                )
              },
              a({ href, children, ...props }) {
                return (
                  <a href={href} target="_blank" rel="noopener noreferrer" {...props}>
                    {children}
                  </a>
                )
              },
            }}
          >
            {segment.content}
          </ReactMarkdown>
        )
      })}
    </div>
  )
}
