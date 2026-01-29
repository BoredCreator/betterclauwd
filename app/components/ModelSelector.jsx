"use client"

import { useState, useRef, useEffect } from 'react'
import styles from './ModelSelector.module.css'
import { PROVIDERS, getProviderConfig } from '@/lib/providers'
import { getApiKeys } from '@/lib/storage'

export default function ModelSelector({ provider, model, onProviderChange, onModelChange }) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)
  const apiKeys = getApiKeys()

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const currentProvider = getProviderConfig(provider)
  const currentModel = currentProvider?.models.find(m => m.id === model)

  const availableProviders = Object.values(PROVIDERS).filter(p => apiKeys[p.id])

  const handleSelectModel = (providerId, modelId) => {
    if (providerId !== provider) {
      onProviderChange(providerId)
    }
    onModelChange(modelId)
    setIsOpen(false)
  }

  return (
    <div className={styles.container} ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={styles.trigger}
        title="Select model"
      >
        <span className={styles.modelName}>
          {currentModel?.name || model}
        </span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`${styles.arrow} ${isOpen ? styles.open : ''}`}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          {availableProviders.length === 0 ? (
            <div className={styles.empty}>
              No API keys configured
            </div>
          ) : (
            availableProviders.map(p => (
              <div key={p.id} className={styles.providerGroup}>
                <div className={styles.providerName}>{p.name}</div>
                {p.models.map(m => (
                  <button
                    key={m.id}
                    onClick={() => handleSelectModel(p.id, m.id)}
                    className={`${styles.modelOption} ${
                      p.id === provider && m.id === model ? styles.selected : ''
                    }`}
                  >
                    <span>{m.name}</span>
                    {m.supportsImages && (
                      <span className={styles.badge} title="Supports images">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                          <circle cx="8.5" cy="8.5" r="1.5"/>
                          <polyline points="21 15 16 10 5 21"/>
                        </svg>
                      </span>
                    )}
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
