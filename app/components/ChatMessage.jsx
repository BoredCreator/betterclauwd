"use client"

import { useState, useRef, useEffect } from 'react'
import styles from './ChatMessage.module.css'
import MarkdownRenderer from './MarkdownRenderer'
import { copyToClipboard, formatDateTime } from '@/lib/utils'

export default function ChatMessage({ message, onRegenerate, onEdit, isLast, isGenerating }) {
  const [copied, setCopied] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState(message.content)
  const textareaRef = useRef(null)
  const isUser = message.role === 'user'

  // Auto-resize textarea when editing
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px'
      textareaRef.current.focus()
    }
  }, [isEditing, editContent])

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content)
    if (success) {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleEdit = () => {
    setEditContent(message.content)
    setIsEditing(true)
  }

  const handleSaveEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      onEdit(message.id, editContent.trim())
    }
    setIsEditing(false)
  }

  const handleCancelEdit = () => {
    setEditContent(message.content)
    setIsEditing(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSaveEdit()
    }
    if (e.key === 'Escape') {
      handleCancelEdit()
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
        {isEditing ? (
          <div className={styles.editContainer}>
            <textarea
              ref={textareaRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              onKeyDown={handleKeyDown}
              className={styles.editTextarea}
              rows={1}
            />
            <div className={styles.editActions}>
              <button onClick={handleSaveEdit} className={styles.saveButton}>
                Save
              </button>
              <button onClick={handleCancelEdit} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            {isUser ? (
              <p>{message.content}</p>
            ) : (
              <MarkdownRenderer content={message.content} />
            )}
            {isGenerating && isLast && !isUser && (
              <span className={styles.cursor}>|</span>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      {!isEditing && (
        <div className={styles.actions}>
          <button
            onClick={handleCopy}
            className={styles.actionButton}
            title="Copy message"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          {onEdit && !isGenerating && (
            <button
              onClick={handleEdit}
              className={styles.actionButton}
              title="Edit message"
            >
              Edit
            </button>
          )}
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
      )}
    </div>
  )
}
