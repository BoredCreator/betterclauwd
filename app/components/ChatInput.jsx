"use client"

import { useState, useRef, useEffect, useCallback } from 'react'
import styles from './ChatInput.module.css'
import ImagePreview from './ImagePreview'
import { fileToBase64Compressed, getImageFromClipboard } from '@/lib/utils'

export default function ChatInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
  supportsImages,
}) {
  const [input, setInput] = useState('')
  const [images, setImages] = useState([])
  const [parallelMode, setParallelMode] = useState(false)
  const textareaRef = useRef(null)
  const fileInputRef = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 200) + 'px'
    }
  }, [input])

  // Handle paste for images
  useEffect(() => {
    const handlePaste = async (e) => {
      if (!supportsImages) return

      const image = await getImageFromClipboard(e.clipboardData)
      if (image) {
        e.preventDefault()
        setImages(prev => [...prev, image])
      }
    }

    const textarea = textareaRef.current
    if (textarea) {
      textarea.addEventListener('paste', handlePaste)
      return () => textarea.removeEventListener('paste', handlePaste)
    }
  }, [supportsImages])

  const doSubmit = useCallback(() => {
    if (disabled || isGenerating) return

    const messageContent = input.trim() || 'solve'
    onSend(messageContent, images, parallelMode && images.length > 1)
    setInput('')
    setImages([])
    setParallelMode(false)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }, [disabled, isGenerating, input, images, parallelMode, onSend])

  const handleSubmit = (e) => {
    e.preventDefault()
    doSubmit()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      doSubmit()
    }
  }

  // iOS Safari: Return key adds a literal '\n' to the textarea value
  // instead of firing keydown. Detect and handle it here.
  const handleChange = (e) => {
    const newValue = e.target.value

    // Detect iOS Return key: value gained exactly one trailing newline
    if (newValue === input + '\n') {
      // doSubmit() reads the current `input` state (before this change), which is correct
      doSubmit()
      return
    }

    setInput(newValue)
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))

    for (const file of imageFiles) {
      const imageData = await fileToBase64Compressed(file)
      setImages(prev => [...prev, imageData])
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    if (!supportsImages) return

    const files = Array.from(e.dataTransfer.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))

    for (const file of imageFiles) {
      const imageData = await fileToBase64Compressed(file)
      setImages(prev => [...prev, imageData])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeImage = (index) => {
    setImages(prev => {
      const updated = prev.filter((_, i) => i !== index)
      // Auto-disable parallel mode if fewer than 2 images remain
      if (updated.length < 2) setParallelMode(false)
      return updated
    })
  }

  return (
    <div className={styles.container}>
      <ImagePreview images={images} onRemove={removeImage} />

      <form
        onSubmit={handleSubmit}
        className={`${styles.form} ${images.length > 0 ? styles.hasImages : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <div className={styles.inputWrapper}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? 'Generating...' : images.length > 0 ? 'Add a message... (optional)' : 'Type a message... (Shift+Enter for new line)'}
            disabled={disabled && !isGenerating}
            className={styles.textarea}
            rows={1}
            enterKeyHint="send"
            autoComplete="off"
            autoCorrect="on"
            autoCapitalize="sentences"
          />

          <div className={styles.actions}>
            {/* Parallel mode hint when exactly 1 image is attached */}
            {supportsImages && images.length === 1 && (
              <span className={styles.parallelHint} title="Attach more images to enable parallel mode — each image gets its own AI response simultaneously">
                +img for parallel
              </span>
            )}

            {/* Parallel mode toggle — appears when 2+ images attached */}
            {supportsImages && images.length > 1 && (
              <button
                type="button"
                onClick={() => setParallelMode(p => !p)}
                className={`${styles.parallelToggle} ${parallelMode ? styles.active : ''}`}
                title={parallelMode
                  ? 'Parallel: each image gets its own AI response simultaneously. Click to switch to combined.'
                  : 'Combined: all images sent in one message. Click to switch to parallel (one response per image).'}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="2" x2="12" y2="22"/>
                  <path d="M4 6l8-4 8 4"/>
                  <path d="M4 18l8 4 8-4"/>
                </svg>
                {parallelMode ? 'Parallel ✓' : 'Combined'}
              </button>
            )}

            {supportsImages && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileSelect}
                  className={styles.fileInput}
                  id="image-upload"
                />
                <label htmlFor="image-upload" className={styles.attachButton} title="Attach image(s)">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </label>
              </>
            )}

            {isGenerating ? (
              <button
                type="button"
                onClick={onStop}
                className={`${styles.sendButton} ${styles.stop}`}
                title="Stop generating"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="4" y="4" width="16" height="16" rx="2"/>
                </svg>
              </button>
            ) : (
              <button
                type="submit"
                disabled={disabled}
                className={styles.sendButton}
                title="Send message"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="22" y1="2" x2="11" y2="13"/>
                  <polygon points="22 2 15 22 11 13 2 9 22 2" fill="currentColor" stroke="none"/>
                </svg>
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  )
}
