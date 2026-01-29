import { AnthropicProvider } from './anthropic'
import { OpenAIProvider } from './openai'
import { GoogleProvider } from './google'
import { XAIProvider } from './xai'
import { DeepSeekProvider } from './deepseek'

// Provider configurations
export const PROVIDERS = {
  anthropic: {
    name: 'Anthropic',
    id: 'anthropic',
    models: [
      { id: 'claude-opus-4-20250514', name: 'Claude Opus 4', supportsImages: true, maxTokens: 32000 },
      { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', supportsImages: true, maxTokens: 64000 },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', supportsImages: true, maxTokens: 8192 },
    ],
    defaultModel: 'claude-sonnet-4-20250514',
    keyPrefix: 'sk-ant-',
    keyPlaceholder: 'sk-ant-...',
  },
  openai: {
    name: 'OpenAI',
    id: 'openai',
    models: [
      { id: 'gpt-4o', name: 'GPT-4o', supportsImages: true, maxTokens: 16384 },
      { id: 'gpt-4o-mini', name: 'GPT-4o Mini', supportsImages: true, maxTokens: 16384 },
      { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', supportsImages: true, maxTokens: 4096 },
      { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', supportsImages: false, maxTokens: 4096 },
    ],
    defaultModel: 'gpt-4o',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
  },
  google: {
    name: 'Google',
    id: 'google',
    models: [
      { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', supportsImages: true, maxTokens: 8192 },
      { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', supportsImages: true, maxTokens: 8192 },
      { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', supportsImages: true, maxTokens: 8192 },
    ],
    defaultModel: 'gemini-2.0-flash',
    keyPrefix: 'AIza',
    keyPlaceholder: 'AIza...',
  },
  xai: {
    name: 'xAI (Grok)',
    id: 'xai',
    models: [
      { id: 'grok-2', name: 'Grok 2', supportsImages: true, maxTokens: 131072 },
      { id: 'grok-2-mini', name: 'Grok 2 Mini', supportsImages: false, maxTokens: 131072 },
    ],
    defaultModel: 'grok-2',
    keyPrefix: 'xai-',
    keyPlaceholder: 'xai-...',
  },
  deepseek: {
    name: 'DeepSeek',
    id: 'deepseek',
    models: [
      { id: 'deepseek-chat', name: 'DeepSeek Chat', supportsImages: false, maxTokens: 8192 },
      { id: 'deepseek-reasoner', name: 'DeepSeek Reasoner', supportsImages: false, maxTokens: 8192 },
    ],
    defaultModel: 'deepseek-chat',
    keyPrefix: 'sk-',
    keyPlaceholder: 'sk-...',
  },
}

// Get provider instance
export const getProvider = (providerId) => {
  switch (providerId) {
    case 'anthropic':
      return new AnthropicProvider()
    case 'openai':
      return new OpenAIProvider()
    case 'google':
      return new GoogleProvider()
    case 'xai':
      return new XAIProvider()
    case 'deepseek':
      return new DeepSeekProvider()
    default:
      throw new Error(`Unknown provider: ${providerId}`)
  }
}

// Get provider config
export const getProviderConfig = (providerId) => {
  return PROVIDERS[providerId] || null
}

// Get all providers
export const getAllProviders = () => {
  return Object.values(PROVIDERS)
}

// Get model by ID
export const getModelById = (providerId, modelId) => {
  const provider = PROVIDERS[providerId]
  if (!provider) return null
  return provider.models.find(m => m.id === modelId) || null
}

// Check if model supports images
export const modelSupportsImages = (providerId, modelId) => {
  const model = getModelById(providerId, modelId)
  return model?.supportsImages || false
}

// Get default model for provider
export const getDefaultModel = (providerId) => {
  const provider = PROVIDERS[providerId]
  return provider?.defaultModel || null
}

// Get max tokens for a model
export const getModelMaxTokens = (providerId, modelId) => {
  const model = getModelById(providerId, modelId)
  return model?.maxTokens || 4096
}
