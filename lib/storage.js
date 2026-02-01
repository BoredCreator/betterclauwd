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
  appearance: 'default', // 'default', 'terminal', 'compact', 'custom'
  font: 'inter', // 'system', 'inter', 'source-sans', 'merriweather', 'mono'
  tokenTrackingEnabled: true,
  autoGenerateTitle: false,
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

// Price per 1M tokens (input/output) - approximate values
export const TOKEN_PRICES = {
  anthropic: {
    'claude-opus-4-20250514': { input: 15, output: 75 },
    'claude-sonnet-4-20250514': { input: 3, output: 15 },
    'claude-3-5-haiku-20241022': { input: 0.8, output: 4 },
  },
  openai: {
    'gpt-4o': { input: 2.5, output: 10 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 },
    'gpt-4-turbo': { input: 10, output: 30 },
    'gpt-4': { input: 30, output: 60 },
  },
  google: {
    'gemini-2.0-flash': { input: 0.075, output: 0.3 },
    'gemini-1.5-pro': { input: 1.25, output: 5 },
    'gemini-1.5-flash': { input: 0.075, output: 0.3 },
  },
  xai: {
    'grok-2': { input: 2, output: 10 },
    'grok-2-vision': { input: 2, output: 10 },
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
