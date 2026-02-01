"use client"

import { useState, useRef, useEffect } from 'react'
import styles from './ChatInput.module.css'
import ImagePreview from './ImagePreview'
import { fileToBase64, getImageFromClipboard } from '@/lib/utils'

export default function ChatInput({
  onSend,
  onStop,
  isGenerating,
  disabled,
  supportsImages,
}) {
  const [input, setInput] = useState('')
  const [images, setImages] = useState([])
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

  const handleSubmit = (e) => {
    e.preventDefault()
    if ((!input.trim() && images.length === 0) || disabled || isGenerating) return

    onSend(input.trim(), images)
    setInput('')
    setImages([])

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files)
    const imageFiles = files.filter(f => f.type.startsWith('image/'))

    for (const file of imageFiles) {
      const imageData = await fileToBase64(file)
      setImages(prev => [...prev, imageData])
    }

    // Reset file input
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
      const imageData = await fileToBase64(file)
      setImages(prev => [...prev, imageData])
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const removeImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index))
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
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isGenerating ? 'Generating...' : 'Type a message... (Shift+Enter for new line)'}
            disabled={disabled || isGenerating}
            className={styles.textarea}
            rows={1}
          />

          <div className={styles.actions}>
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
                <label htmlFor="image-upload" className={styles.attachButton} title="Attach image">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                    <circle cx="8.5" cy="8.5" r="1.5"/>
                    <polyline points="21 15 16 10 5 21"/>
                  </svg>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={(!input.trim() && images.length === 0) || disabled || isGenerating}
              className={styles.sendButton}
              title="Send message"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="22" y1="2" x2="11" y2="13"/>
                <polygon points="22 2 15 22 11 13 2 9 22 2"/>
              </svg>
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
