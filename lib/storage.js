// localStorage keys
const KEYS = {
  API_KEYS: 'ai_keys',
  CHATS: 'ai_chats',
  SETTINGS: 'ai_settings',
  MESSAGE_COUNT: 'ai_message_count',
  PROMO_HIDDEN: 'ai_promo_hidden',
  TOKEN_USAGE: 'ai_token_usage',
  CUSTOM_ENDPOINTS: 'ai_custom_endpoints',
  LAST_USED_MODEL: 'ai_last_model',
  CUSTOM_PROVIDER_CONFIG: 'ai_custom_provider',
  MODEL_OVERRIDES: 'ai_model_overrides',
}

// Simple encoding/decoding for API keys (not secure, just obfuscation)
const encode = (str) => {
  if (typeof window === 'undefined') return str
  return btoa(encodeURIComponent(str))
}

const decode = (str) => {
  if (typeof window === 'undefined') return str
  try {
    return decodeURIComponent(atob(str))
  } catch {
    return str
  }
}

// Generate unique ID
export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2)
}

// API Keys
export const getApiKeys = () => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(KEYS.API_KEYS)
    if (!stored) return {}
    const parsed = JSON.parse(stored)
    // Decode all keys
    const decoded = {}
    for (const [provider, key] of Object.entries(parsed)) {
      decoded[provider] = decode(key)
    }
    return decoded
  } catch {
    return {}
  }
}

export const setApiKey = (provider, key) => {
  if (typeof window === 'undefined') return
  const keys = getApiKeys()
  if (key) {
    keys[provider] = key
  } else {
    delete keys[provider]
  }
  // Encode all keys before storing
  const encoded = {}
  for (const [p, k] of Object.entries(keys)) {
    encoded[p] = encode(k)
  }
  localStorage.setItem(KEYS.API_KEYS, JSON.stringify(encoded))
}

export const hasAnyApiKey = () => {
  const keys = getApiKeys()
  return Object.values(keys).some(k => k && k.length > 0)
}

// IndexedDB for chat storage (no size limits like localStorage)
const DB_NAME = 'betterclauwd'
const DB_VERSION = 1
const CHAT_STORE = 'chats'

const openDB = () => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') return reject(new Error('No window'))
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (e) => {
      const db = e.target.result
      if (!db.objectStoreNames.contains(CHAT_STORE)) {
        const store = db.createObjectStore(CHAT_STORE, { keyPath: 'id' })
        store.createIndex('updatedAt', 'updatedAt', { unique: false })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

// Migrate from localStorage to IndexedDB (one-time)
const migrateFromLocalStorage = async () => {
  try {
    const stored = localStorage.getItem(KEYS.CHATS)
    if (!stored) return
    const chats = JSON.parse(stored)
    if (!chats.length) return
    const db = await openDB()
    const tx = db.transaction(CHAT_STORE, 'readwrite')
    const store = tx.objectStore(CHAT_STORE)
    for (const chat of chats) {
      store.put(chat)
    }
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = () => reject(tx.error)
    })
    localStorage.removeItem(KEYS.CHATS)
    db.close()
  } catch {
    // Migration failed, localStorage data remains as fallback
  }
}

// Run migration on first load
if (typeof window !== 'undefined') {
  migrateFromLocalStorage()
}

// Chats (IndexedDB with localStorage fallback)
export const getChats = async () => {
  if (typeof window === 'undefined') return []
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(CHAT_STORE, 'readonly')
      const store = tx.objectStore(CHAT_STORE)
      const request = store.getAll()
      request.onsuccess = () => {
        db.close()
        const chats = request.result || []
        // Sort by updatedAt descending (newest first)
        chats.sort((a, b) => (b.updatedAt || b.createdAt || '').localeCompare(a.updatedAt || a.createdAt || ''))
        resolve(chats)
      }
      request.onerror = () => {
        db.close()
        resolve([])
      }
    })
  } catch {
    return []
  }
}

export const saveChat = async (chat) => {
  if (typeof window === 'undefined') return
  try {
    const updatedChat = {
      ...chat,
      updatedAt: new Date().toISOString(),
    }
    if (!updatedChat.createdAt) {
      updatedChat.createdAt = new Date().toISOString()
    }
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(CHAT_STORE, 'readwrite')
      const store = tx.objectStore(CHAT_STORE)
      store.put(updatedChat)
      tx.oncomplete = () => {
        db.close()
        resolve(updatedChat)
      }
      tx.onerror = () => {
        db.close()
        resolve(updatedChat)
      }
    })
  } catch {
    return chat
  }
}

export const deleteChat = async (chatId) => {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(CHAT_STORE, 'readwrite')
      const store = tx.objectStore(CHAT_STORE)
      store.delete(chatId)
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); resolve() }
    })
  } catch {
    // Silently fail
  }
}

export const getChatById = async (chatId) => {
  if (typeof window === 'undefined') return null
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(CHAT_STORE, 'readonly')
      const store = tx.objectStore(CHAT_STORE)
      const request = store.get(chatId)
      request.onsuccess = () => {
        db.close()
        resolve(request.result || null)
      }
      request.onerror = () => {
        db.close()
        resolve(null)
      }
    })
  } catch {
    return null
  }
}

// Delete the oldest N chats
export const deleteOldestChats = async (count = 5) => {
  if (typeof window === 'undefined') return
  try {
    const chats = await getChats() // already sorted newest first
    const toDelete = chats.slice(-count) // take the oldest N
    const db = await openDB()
    const tx = db.transaction(CHAT_STORE, 'readwrite')
    const store = tx.objectStore(CHAT_STORE)
    for (const chat of toDelete) {
      store.delete(chat.id)
    }
    await new Promise((resolve) => {
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); resolve() }
    })
  } catch {
    // Silently fail
  }
}

// Sync helper for clearing all chats from IndexedDB
export const clearAllChats = async () => {
  if (typeof window === 'undefined') return
  try {
    const db = await openDB()
    return new Promise((resolve) => {
      const tx = db.transaction(CHAT_STORE, 'readwrite')
      const store = tx.objectStore(CHAT_STORE)
      store.clear()
      tx.oncomplete = () => { db.close(); resolve() }
      tx.onerror = () => { db.close(); resolve() }
    })
  } catch {
    // Silently fail
  }
}

// Settings
const DEFAULT_SETTINGS = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-sonnet-4-5-20250929',
  defaultSystemPrompt: 'You are a helpful assistant.',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  theme: 'dark',
  appearance: 'default', // 'default', 'terminal', 'compact', 'custom'
  font: 'inter', // 'system', 'inter', 'source-sans', 'merriweather', 'mono'
  tokenTrackingEnabled: true,
  autoGenerateTitle: false,
  webSearchEnabled: false, // Enable web search for supported models
  imageGenerationEnabled: false, // Enable image generation commands for supported providers
  // Custom appearance settings
  customAppearance: {
    baseStyle: 'default', // 'default' or 'terminal'
    fontSize: 14,
    compactness: 50, // 0-100, controls line-height and spacing together
    messagePadding: 12, // px
    borderRadius: 4, // px
    codeBlockFontSize: 13,
    showTimestamps: true,
    showAvatars: false,
    compactHeaders: false,
  },
}

export const getSettings = () => {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const stored = localStorage.getItem(KEYS.SETTINGS)
    return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

export const updateSettings = (updates) => {
  if (typeof window === 'undefined') return
  const settings = getSettings()
  const newSettings = { ...settings, ...updates }
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(newSettings))
  return newSettings
}

// Last used model (persists across new chats)
export const getLastUsedModel = () => {
  if (typeof window === 'undefined') return null
  try {
    const stored = localStorage.getItem(KEYS.LAST_USED_MODEL)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

export const setLastUsedModel = (provider, model) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.LAST_USED_MODEL, JSON.stringify({ provider, model }))
}

// Export/Import
export const exportAllData = async () => {
  return {
    chats: await getChats(),
    settings: getSettings(),
    // Don't export API keys for security
    exportedAt: new Date().toISOString(),
  }
}

export const importData = async (data) => {
  if (typeof window === 'undefined') return
  if (data.chats) {
    for (const chat of data.chats) {
      await saveChat(chat)
    }
  }
  if (data.settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings))
  }
}

// Clear all data
export const clearAllData = async () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEYS.API_KEYS)
  localStorage.removeItem(KEYS.SETTINGS)
  await clearAllChats()
}

// Message count tracking for promo
export const getMessageCount = () => {
  if (typeof window === 'undefined') return 0
  try {
    return parseInt(localStorage.getItem(KEYS.MESSAGE_COUNT) || '0', 10)
  } catch {
    return 0
  }
}

export const incrementMessageCount = () => {
  if (typeof window === 'undefined') return 0
  const count = getMessageCount() + 1
  localStorage.setItem(KEYS.MESSAGE_COUNT, count.toString())
  return count
}

// Promo message visibility
export const isPromoHidden = () => {
  if (typeof window === 'undefined') return false
  return localStorage.getItem(KEYS.PROMO_HIDDEN) === 'true'
}

export const hidePromoForever = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.PROMO_HIDDEN, 'true')
}

// Token usage tracking
export const getTokenUsage = () => {
  if (typeof window === 'undefined') return { total: { input: 0, output: 0, cost: 0 }, byProvider: {} }
  try {
    const stored = localStorage.getItem(KEYS.TOKEN_USAGE)
    return stored ? JSON.parse(stored) : { total: { input: 0, output: 0, cost: 0 }, byProvider: {} }
  } catch {
    return { total: { input: 0, output: 0, cost: 0 }, byProvider: {} }
  }
}

export const addTokenUsage = (provider, model, inputTokens, outputTokens, cost) => {
  if (typeof window === 'undefined') return
  const usage = getTokenUsage()

  // Update total
  usage.total.input += inputTokens
  usage.total.output += outputTokens
  usage.total.cost += cost

  // Update by provider
  if (!usage.byProvider[provider]) {
    usage.byProvider[provider] = { input: 0, output: 0, cost: 0 }
  }
  usage.byProvider[provider].input += inputTokens
  usage.byProvider[provider].output += outputTokens
  usage.byProvider[provider].cost += cost

  localStorage.setItem(KEYS.TOKEN_USAGE, JSON.stringify(usage))
  return usage
}

export const resetTokenUsage = () => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.TOKEN_USAGE, JSON.stringify({ total: { input: 0, output: 0, cost: 0 }, byProvider: {} }))
}

// Custom API endpoints
export const getCustomEndpoints = () => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(KEYS.CUSTOM_ENDPOINTS)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export const setCustomEndpoint = (provider, endpoint) => {
  if (typeof window === 'undefined') return
  const endpoints = getCustomEndpoints()
  if (endpoint) {
    endpoints[provider] = endpoint
  } else {
    delete endpoints[provider]
  }
  localStorage.setItem(KEYS.CUSTOM_ENDPOINTS, JSON.stringify(endpoints))
}

// Custom Provider Configuration
const DEFAULT_CUSTOM_PROVIDER_CONFIG = {
  endpoint: '',
  models: [
    { id: 'custom-model', name: 'Custom Model', supportsImages: true, maxTokens: 32000 },
  ],
  enabled: false,
}

export const getCustomProviderConfig = () => {
  if (typeof window === 'undefined') return DEFAULT_CUSTOM_PROVIDER_CONFIG
  try {
    const stored = localStorage.getItem(KEYS.CUSTOM_PROVIDER_CONFIG)
    return stored ? { ...DEFAULT_CUSTOM_PROVIDER_CONFIG, ...JSON.parse(stored) } : DEFAULT_CUSTOM_PROVIDER_CONFIG
  } catch {
    return DEFAULT_CUSTOM_PROVIDER_CONFIG
  }
}

export const setCustomProviderConfig = (config) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.CUSTOM_PROVIDER_CONFIG, JSON.stringify(config))
}

export const updateCustomProviderConfig = (updates) => {
  if (typeof window === 'undefined') return
  const config = getCustomProviderConfig()
  const newConfig = { ...config, ...updates }
  localStorage.setItem(KEYS.CUSTOM_PROVIDER_CONFIG, JSON.stringify(newConfig))
  return newConfig
}

// Price per 1M tokens (input/output) - approximate values for 2026 models
export const TOKEN_PRICES = {
  anthropic: {
    'claude-opus-4-6': { input: 15, output: 75 },
    'claude-opus-4-5-20251101': { input: 15, output: 75 },
    'claude-sonnet-4-5-20250929': { input: 3, output: 15 },
    'claude-haiku-4-5-20251001': { input: 0.8, output: 4 },
  },
  openai: {
    // GPT-5 Series
    'gpt-5.2': { input: 5, output: 15 },
    'gpt-5-mini': { input: 0.5, output: 1.5 },
    'gpt-5-nano': { input: 0.15, output: 0.6 },
    // Reasoning Models
    'o4-mini': { input: 3, output: 12 },
    'o3': { input: 10, output: 40 },
    // GPT-4 Series
    'gpt-4.1': { input: 2, output: 8 },
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4o-search-preview': { input: 2.5, output: 10 },
  },
  google: {
    'gemini-3-pro': { input: 1.25, output: 5 },
    'gemini-3-flash': { input: 0.075, output: 0.3 },
    'gemini-2.5-pro': { input: 1.25, output: 5 },
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
  },
  xai: {
    'grok-4': { input: 3, output: 15 },
    'grok-3': { input: 2, output: 10 },
    'grok-2': { input: 2, output: 10 },
  },
  deepseek: {
    'deepseek-chat': { input: 0.14, output: 0.28 },
    'deepseek-reasoner': { input: 0.55, output: 2.19 },
  },
}

export const calculateCost = (provider, model, inputTokens, outputTokens) => {
  const prices = TOKEN_PRICES[provider]?.[model]
  if (!prices) return 0
  return (inputTokens * prices.input / 1000000) + (outputTokens * prices.output / 1000000)
}

// Model ID Overrides - allows users to manually override model IDs
export const getProviderModelOverrides = () => {
  if (typeof window === 'undefined') return {}
  try {
    const stored = localStorage.getItem(KEYS.MODEL_OVERRIDES)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

export const setProviderModelOverrides = (overrides) => {
  if (typeof window === 'undefined') return
  localStorage.setItem(KEYS.MODEL_OVERRIDES, JSON.stringify(overrides))
}

export const getActualModelId = (provider, modelId) => {
  const overrides = getProviderModelOverrides()
  return overrides[provider]?.[modelId] || modelId
}
