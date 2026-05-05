"use client"

import styles from './ImagePreview.module.css'

export default function ImagePreview({ images, documents, onRemove, onRemoveDocument }) {
  const hasImages = images && images.length > 0
  const hasDocs = documents && documents.length > 0
  if (!hasImages && !hasDocs) return null

  return (
    <div className={styles.container}>
      {hasImages && images.map((img, idx) => (
        <div key={`img-${idx}`} className={styles.imageWrapper}>
          <img
            src={`data:${img.mimeType || 'image/png'};base64,${img.base64}`}
            alt={`Preview ${idx + 1}`}
            className={styles.image}
          />
          <button
            onClick={() => onRemove(idx)}
            className={styles.removeButton}
            title="Remove image"
          >
            x
          </button>
        </div>
      ))}
      {hasDocs && documents.map((doc, idx) => (
        <div
          key={`doc-${idx}`}
          className={styles.imageWrapper}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 0.75rem',
            border: '1px solid var(--border)',
            borderRadius: '6px',
            background: 'var(--bg-secondary, transparent)',
            minWidth: 0,
            maxWidth: '220px',
          }}
          title={doc.name}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0 }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
            {doc.name || 'document.pdf'}
          </span>
          <button
            onClick={() => onRemoveDocument && onRemoveDocument(idx)}
            className={styles.removeButton}
            title="Remove document"
            style={{ position: 'static', marginLeft: 'auto' }}
          >
            x
          </button>
        </div>
      ))}
    </div>
  )
}
