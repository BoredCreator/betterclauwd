"use client"

import { useState } from 'react'
import styles from './Settings.module.css'
import { PROVIDERS, getModelMaxTokens, DEFAULT_ENDPOINTS } from '@/lib/providers'
import { getApiKeys, setApiKey, getSettings, updateSettings, exportAllData, importData, clearAllData, getTokenUsage, resetTokenUsage, getCustomEndpoints, setCustomEndpoint } from '@/lib/storage'

export default function Settings({ isOpen, onClose }) {
  const [activeTab, setActiveTab] = useState('api-keys')
  const [keys, setKeys] = useState(getApiKeys())
  const [settings, setSettings] = useState(getSettings())
  const [showClearConfirm, setShowClearConfirm] = useState(false)
  const [tokenUsage, setTokenUsage] = useState(getTokenUsage())
  const [customEndpoints, setCustomEndpoints] = useState(getCustomEndpoints())

  if (!isOpen) return null

  const handleKeyChange = (providerId, value) => {
    setKeys(prev => ({ ...prev, [providerId]: value }))
  }

  const saveApiKeys = () => {
    for (const [providerId, key] of Object.entries(keys)) {
      setApiKey(providerId, key)
    }
    alert('API keys saved!')
  }

  const handleSettingChange = (key, value) => {
    const newSettings = { ...settings, [key]: value }
    setSettings(newSettings)
    updateSettings(newSettings)
  }

  const handleExport = () => {
    const data = exportAllData()
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `better-ai-export-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)
        importData(data)
        setSettings(getSettings())
        alert('Data imported successfully!')
      } catch {
        alert('Failed to import data. Invalid file format.')
      }
    }
    reader.readAsText(file)
  }

  const handleClearAll = () => {
    clearAllData()
    setKeys({})
    setSettings(getSettings())
    setShowClearConfirm(false)
    alert('All data cleared!')
    window.location.reload()
  }

  const handleThemeChange = (theme) => {
    handleSettingChange('theme', theme)
    document.documentElement.setAttribute('data-theme', theme)
  }

  const handleAppearanceChange = (appearance) => {
    handleSettingChange('appearance', appearance)
    document.documentElement.setAttribute('data-appearance', appearance)
  }

  const handleEndpointChange = (providerId, value) => {
    const newEndpoints = { ...customEndpoints, [providerId]: value }
    setCustomEndpoints(newEndpoints)
    setCustomEndpoint(providerId, value)
  }

  const handleResetTokenUsage = () => {
    resetTokenUsage()
    setTokenUsage(getTokenUsage())
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Settings</h2>
          <button onClick={onClose} className={styles.closeButton}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'api-keys' ? styles.active : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            API Keys
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'defaults' ? styles.active : ''}`}
            onClick={() => setActiveTab('defaults')}
          >
            Defaults
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'advanced' ? styles.active : ''}`}
            onClick={() => setActiveTab('advanced')}
          >
            Advanced
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'data' ? styles.active : ''}`}
            onClick={() => setActiveTab('data')}
          >
            Data
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'api-keys' && (
            <div className={styles.section}>
              <p className={styles.sectionDesc}>
                Manage your API keys for each provider.
              </p>
              {Object.values(PROVIDERS).map(provider => (
                <div key={provider.id} className={styles.field}>
                  <label className={styles.label}>{provider.name}</label>
                  <input
                    type="password"
                    value={keys[provider.id] || ''}
                    onChange={(e) => handleKeyChange(provider.id, e.target.value)}
                    placeholder={provider.keyPlaceholder}
                    className={styles.input}
                  />
                </div>
              ))}
              <button onClick={saveApiKeys} className={styles.saveButton}>
                Save API Keys
              </button>
            </div>
          )}

          {activeTab === 'defaults' && (
            <div className={styles.section}>
              <p className={styles.sectionDesc}>
                Configure default settings for new chats.
              </p>

              <div className={styles.field}>
                <label className={styles.label}>Theme</label>
                <div className={styles.themeButtons}>
                  <button
                    className={`${styles.themeButton} ${settings.theme === 'dark' ? styles.active : ''}`}
                    onClick={() => handleThemeChange('dark')}
                  >
                    Dark
                  </button>
                  <button
                    className={`${styles.themeButton} ${settings.theme === 'light' ? styles.active : ''}`}
                    onClick={() => handleThemeChange('light')}
                  >
                    Light
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Appearance</label>
                <div className={styles.themeButtons}>
                  <button
                    className={`${styles.themeButton} ${settings.appearance === 'default' ? styles.active : ''}`}
                    onClick={() => handleAppearanceChange('default')}
                  >
                    Default
                  </button>
                  <button
                    className={`${styles.themeButton} ${settings.appearance === 'terminal' ? styles.active : ''}`}
                    onClick={() => handleAppearanceChange('terminal')}
                  >
                    Terminal
                  </button>
                  <button
                    className={`${styles.themeButton} ${settings.appearance === 'compact' ? styles.active : ''}`}
                    onClick={() => handleAppearanceChange('compact')}
                  >
                    Compact
                  </button>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Default Provider</label>
                <select
                  value={settings.defaultProvider}
                  onChange={(e) => handleSettingChange('defaultProvider', e.target.value)}
                  className={styles.select}
                >
                  {Object.values(PROVIDERS).map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Default Model</label>
                <select
                  value={settings.defaultModel}
                  onChange={(e) => handleSettingChange('defaultModel', e.target.value)}
                  className={styles.select}
                >
                  {PROVIDERS[settings.defaultProvider]?.models.map(model => (
                    <option key={model.id} value={model.id}>
                      {model.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Temperature: {settings.defaultTemperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={settings.defaultTemperature}
                  onChange={(e) => handleSettingChange('defaultTemperature', parseFloat(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Max Tokens: {settings.defaultMaxTokens.toLocaleString()} / {getModelMaxTokens(settings.defaultProvider, settings.defaultModel).toLocaleString()}
                </label>
                <input
                  type="range"
                  min="256"
                  max={getModelMaxTokens(settings.defaultProvider, settings.defaultModel)}
                  step="256"
                  value={Math.min(settings.defaultMaxTokens, getModelMaxTokens(settings.defaultProvider, settings.defaultModel))}
                  onChange={(e) => handleSettingChange('defaultMaxTokens', parseInt(e.target.value))}
                  className={styles.slider}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Default System Prompt</label>
                <textarea
                  value={settings.defaultSystemPrompt}
                  onChange={(e) => handleSettingChange('defaultSystemPrompt', e.target.value)}
                  className={styles.textarea}
                  rows={4}
                />
              </div>

              <div className={styles.field}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.autoGenerateTitle || false}
                    onChange={(e) => handleSettingChange('autoGenerateTitle', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>Auto-generate chat titles</span>
                  <span className={styles.toggleHint}>Uses a cheaper model to generate titles automatically</span>
                </label>
              </div>

              <div className={styles.field}>
                <label className={styles.toggleLabel}>
                  <input
                    type="checkbox"
                    checked={settings.tokenTrackingEnabled || false}
                    onChange={(e) => handleSettingChange('tokenTrackingEnabled', e.target.checked)}
                    className={styles.checkbox}
                  />
                  <span className={styles.toggleText}>Enable token tracking</span>
                  <span className={styles.toggleHint}>Track token usage and estimated costs</span>
                </label>
              </div>

              {settings.tokenTrackingEnabled && (
                <div className={styles.tokenStats}>
                  <h4>Total Usage</h4>
                  <div className={styles.statRow}>
                    <span>Input tokens:</span>
                    <span>{tokenUsage.total.input.toLocaleString()}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span>Output tokens:</span>
                    <span>{tokenUsage.total.output.toLocaleString()}</span>
                  </div>
                  <div className={styles.statRow}>
                    <span>Estimated cost:</span>
                    <span>${tokenUsage.total.cost.toFixed(4)}</span>
                  </div>
                  <button onClick={handleResetTokenUsage} className={styles.resetButton}>
                    Reset Usage Stats
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'advanced' && (
            <div className={styles.section}>
              <p className={styles.sectionDesc}>
                Custom API endpoints for each provider. Leave blank to use defaults.
              </p>
              {Object.values(PROVIDERS).map(provider => (
                <div key={provider.id} className={styles.field}>
                  <label className={styles.label}>{provider.name} Endpoint</label>
                  <input
                    type="text"
                    value={customEndpoints[provider.id] || ''}
                    onChange={(e) => handleEndpointChange(provider.id, e.target.value)}
                    placeholder={DEFAULT_ENDPOINTS[provider.id]}
                    className={styles.input}
                  />
                </div>
              ))}
              <p className={styles.note}>
                Note: Custom endpoints must be compatible with the provider's API format.
              </p>
            </div>
          )}

          {activeTab === 'data' && (
            <div className={styles.section}>
              <p className={styles.sectionDesc}>
                Export, import, or clear your data.
              </p>

              <div className={styles.dataActions}>
                <button onClick={handleExport} className={styles.dataButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  Export Data
                </button>

                <label className={styles.dataButton}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="7 10 12 15 17 10"/>
                    <line x1="12" y1="15" x2="12" y2="3"/>
                  </svg>
                  Import Data
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleImport}
                    className={styles.fileInput}
                  />
                </label>

                {!showClearConfirm ? (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className={`${styles.dataButton} ${styles.danger}`}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                    Clear All Data
                  </button>
                ) : (
                  <div className={styles.confirmClear}>
                    <span>Are you sure?</span>
                    <button onClick={handleClearAll} className={styles.confirmYes}>
                      Yes, clear all
                    </button>
                    <button onClick={() => setShowClearConfirm(false)} className={styles.confirmNo}>
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <p className={styles.note}>
                Note: API keys are not included in exports for security.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
