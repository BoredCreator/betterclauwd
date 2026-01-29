"use client"

import styles from './ImagePreview.module.css'

export default function ImagePreview({ images, onRemove }) {
  if (!images || images.length === 0) return null

  return (
    <div className={styles.container}>
      {images.map((img, idx) => (
        <div key={idx} className={styles.imageWrapper}>
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
    </div>
  )
}
