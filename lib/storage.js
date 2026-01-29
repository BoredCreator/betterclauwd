// localStorage keys
const KEYS = {
  API_KEYS: 'ai_keys',
  CHATS: 'ai_chats',
  SETTINGS: 'ai_settings',
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

// Chats
export const getChats = () => {
  if (typeof window === 'undefined') return []
  try {
    const stored = localStorage.getItem(KEYS.CHATS)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

export const saveChat = (chat) => {
  if (typeof window === 'undefined') return
  const chats = getChats()
  const existingIndex = chats.findIndex(c => c.id === chat.id)

  const updatedChat = {
    ...chat,
    updatedAt: new Date().toISOString(),
  }

  if (existingIndex >= 0) {
    chats[existingIndex] = updatedChat
  } else {
    updatedChat.createdAt = new Date().toISOString()
    chats.unshift(updatedChat)
  }

  localStorage.setItem(KEYS.CHATS, JSON.stringify(chats))
  return updatedChat
}

export const deleteChat = (chatId) => {
  if (typeof window === 'undefined') return
  const chats = getChats().filter(c => c.id !== chatId)
  localStorage.setItem(KEYS.CHATS, JSON.stringify(chats))
}

export const getChatById = (chatId) => {
  return getChats().find(c => c.id === chatId) || null
}

// Settings
const DEFAULT_SETTINGS = {
  defaultProvider: 'anthropic',
  defaultModel: 'claude-sonnet-4-20250514',
  defaultSystemPrompt: 'You are a helpful assistant.',
  defaultTemperature: 0.7,
  defaultMaxTokens: 4096,
  theme: 'dark',
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

// Export/Import
export const exportAllData = () => {
  return {
    chats: getChats(),
    settings: getSettings(),
    // Don't export API keys for security
    exportedAt: new Date().toISOString(),
  }
}

export const importData = (data) => {
  if (typeof window === 'undefined') return
  if (data.chats) {
    localStorage.setItem(KEYS.CHATS, JSON.stringify(data.chats))
  }
  if (data.settings) {
    localStorage.setItem(KEYS.SETTINGS, JSON.stringify(data.settings))
  }
}

// Clear all data
export const clearAllData = () => {
  if (typeof window === 'undefined') return
  localStorage.removeItem(KEYS.API_KEYS)
  localStorage.removeItem(KEYS.CHATS)
  localStorage.removeItem(KEYS.SETTINGS)
}
