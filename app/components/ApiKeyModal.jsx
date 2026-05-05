"use client"

import { useState } from 'react'
import styles from './ApiKeyModal.module.css'
import { PROVIDERS } from '@/lib/providers'
import { getApiKeys, setApiKey, setIncognito, setSessionKeys, isIncognito } from '@/lib/storage'

export default function ApiKeyModal({ onClose, onSave }) {
  const existingKeys = getApiKeys()
  const [keys, setKeys] = useState(existingKeys)
  const [errors, setErrors] = useState({})
  const [passcode, setPasscode] = useState('')
  const [adminMode, setAdminMode] = useState(false)
  const [adminBusy, setAdminBusy] = useState(false)
  const [adminMessage, setAdminMessage] = useState(null)
  const [adminError, setAdminError] = useState(null)
  // Default ON: safer for "I'm on someone else's laptop" — keys stay in
  // memory only, nothing touches disk.
  const [incognitoChecked, setIncognitoChecked] = useState(isIncognito())

  const handleKeyChange = (providerId, value) => {
    setKeys(prev => ({ ...prev, [providerId]: value }))
    setErrors(prev => ({ ...prev, [providerId]: null }))
  }

  const persistLocally = (next) => {
    // setApiKey internally respects incognito (writes to memory, not disk)
    for (const [providerId, key] of Object.entries(next)) {
      setApiKey(providerId, key)
    }
  }

  const handleSave = async () => {
    // Apply incognito mode BEFORE persisting so setApiKey routes to memory
    setIncognito(incognitoChecked)
    if (incognitoChecked) {
      // In incognito, seed the in-memory store with whatever's in the form
      setSessionKeys(keys)
    }
    persistLocally(keys)
    // If admin is authenticated AND not in incognito, mirror keys to the
    // server vault so they sync everywhere. Skip in incognito since the user
    // has signaled they don't want this device involved in persistence.
    if (adminMode && passcode && !incognitoChecked) {
      try {
        await fetch('/api/keys', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ passcode, keys }),
        })
      } catch {
        // Network failed — local save still succeeded
      }
    }
    onSave()
    if (onClose) onClose()
  }

  const handleAdminLoad = async () => {
    setAdminBusy(true)
    setAdminError(null)
    setAdminMessage(null)
    try {
      const res = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passcode }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        if (res.status === 423) {
          setAdminError('Endpoint locked due to too many failed attempts. Try again in up to an hour.')
        } else if (typeof data.attemptsRemaining === 'number') {
          setAdminError(`Wrong passcode. ${data.attemptsRemaining} attempts left this hour.`)
        } else {
          setAdminError(data.error || 'Failed to load keys.')
        }
        return
      }
      const fetched = data.keys || {}
      setKeys(prev => ({ ...prev, ...fetched }))
      // Apply incognito choice immediately so persistLocally routes correctly
      setIncognito(incognitoChecked)
      if (incognitoChecked) setSessionKeys(fetched)
      persistLocally(fetched)
      setAdminMode(true)
      const count = Object.keys(fetched).length
      setAdminMessage(count
        ? `Loaded ${count} key${count === 1 ? '' : 's'} from server.`
        : 'Authenticated — server has no keys saved yet.')
    } catch (err) {
      setAdminError(err.message || 'Network error.')
    } finally {
      setAdminBusy(false)
    }
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
          {/* Admin passcode — pulls keys from the server vault */}
          <div className={styles.provider}>
            <label className={styles.label}>
              Admin passcode
              {adminMode && <span className={styles.configured}>(authenticated)</span>}
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Enter to auto-load saved keys"
                className={styles.input}
                style={{ flex: 1 }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && passcode && !adminBusy) handleAdminLoad()
                }}
              />
              <button
                onClick={handleAdminLoad}
                disabled={!passcode || adminBusy}
                className={styles.saveButton}
                style={{ whiteSpace: 'nowrap' }}
              >
                {adminBusy ? '...' : 'Load'}
              </button>
            </div>
            {adminError && <span className={styles.errorText}>{adminError}</span>}
            {adminMessage && <span className={styles.validating}>{adminMessage}</span>}

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginTop: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={incognitoChecked}
                onChange={(e) => setIncognitoChecked(e.target.checked)}
                style={{ marginTop: '0.15rem' }}
              />
              <span>
                <strong>Use on this device only</strong> — keys and chat history stay in memory and disappear when you close the tab. Recommended on shared computers.
              </span>
            </label>
          </div>

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
            </div>
          ))}
        </div>

        <div className={styles.footer}>
          <p className={styles.hint}>
            {incognitoChecked
              ? 'Incognito mode: keys live only in this tab\'s memory and disappear when the tab closes. API requests still go directly from your browser to the AI provider.'
              : 'Keys are stored locally in your browser. With the admin passcode they also sync via the server vault so they auto-populate on any device.'}
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
