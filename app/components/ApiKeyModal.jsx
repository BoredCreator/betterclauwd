"use client"

import { useState } from 'react'
import styles from './ApiKeyModal.module.css'
import { PROVIDERS } from '@/lib/providers'
import { getApiKeys, setApiKey } from '@/lib/storage'

export default function ApiKeyModal({ onClose, onSave }) {
  const existingKeys = getApiKeys()
  const [keys, setKeys] = useState(existingKeys)
  const [validating, setValidating] = useState({})
  const [errors, setErrors] = useState({})

  const handleKeyChange = (providerId, value) => {
    setKeys(prev => ({ ...prev, [providerId]: value }))
    setErrors(prev => ({ ...prev, [providerId]: null }))
  }

  const handleSave = () => {
    // Save all keys
    for (const [providerId, key] of Object.entries(keys)) {
      setApiKey(providerId, key)
    }
    onSave()
    if (onClose) onClose()
  }

  const hasAnyKey = Object.values(keys).some(k => k && k.length > 0)

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>API Keys Setup</h2>
          <p className={styles.subtitle}>
            Enter your API keys to start chatting. You only need one key to get started.
          </p>
        </div>

        <div className={styles.providers}>
          {Object.values(PROVIDERS).map(provider => (
            <div key={provider.id} className={styles.provider}>
              <label className={styles.label}>
                {provider.name}
                {keys[provider.id] && (
                  <span className={styles.configured}>(configured)</span>
                )}
              </label>
              <input
                type="password"
                value={keys[provider.id] || ''}
                onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                placeholder={provider.keyPlaceholder}
                className={`${styles.input} ${errors[provider.id] ? styles.error : ''}`}
              />
              {errors[provider.id] && (
                <span className={styles.errorText}>{errors[provider.id]}</span>
              )}
              {validating[provider.id] && (
                <span className={styles.validating}>Validating...</span>
              )}
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.hint}>
            Keys are stored locally in your browser. They are never sent to any server except the respective AI providers.
          </p>
          <div className={styles.buttons}>
            {onClose && (
              <button onClick={onClose} className={styles.cancelButton}>
                Cancel
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={!hasAnyKey}
              className={styles.saveButton}
            >
              Save & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
