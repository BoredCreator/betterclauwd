"use client"

import { useState } from 'react'
import styles from './ChatMessage.module.css'
import MarkdownRenderer from './MarkdownRenderer'
import { copyToClipboard, formatDateTime } from '@/lib/utils'

export default function ChatMessage({ message, onRegenerate, isLast, isGenerating }) {
  const [copied, setCopied] = useState(false)
  const isUser = message.role === 'user'

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className={`${styles.message} ${isUser ? styles.user : styles.assistant}`}>
      <div className={styles.header}>
        <span className={styles.role}>{isUser ? 'You' : 'Assistant'}</span>
        <span className={styles.time}>{formatDateTime(message.timestamp)}</span>
      </div>

      {/* Attached images */}
      {message.images && message.images.length > 0 && (
        <div className={styles.images}>
          {message.images.map((img, idx) => (
            <img
              key={idx}
              src={`data:${img.mimeType || 'image/png'};base64,${img.base64}`}
              alt={`Attached image ${idx + 1}`}
              className={styles.attachedImage}
            />
          ))}
        </div>
      )}

      {/* Message content */}
      <div className={styles.content}>
        {isUser ? (
          <p>{message.content}</p>
        ) : (
          <MarkdownRenderer content={message.content} />
        )}
        {isGenerating && isLast && !isUser && (
          <span className={styles.cursor}>|</span>
        )}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button
          onClick={handleCopy}
          className={styles.actionButton}
          title="Copy message"
        >
          {copied ? 'Copied!' : 'Copy'}
        </button>
        {!isUser && isLast && !isGenerating && onRegenerate && (
          <button
            onClick={onRegenerate}
            className={styles.actionButton}
            title="Regenerate response"
          >
            Regenerate
          </button>
        )}
      </div>
    </div>
  )
}
